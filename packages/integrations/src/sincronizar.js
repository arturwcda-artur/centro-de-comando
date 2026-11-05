/**
 * Sincronizador — executado pelo GitHub Actions a cada hora (ADR 0012) ou manualmente.
 * Lê Trello, Google Agenda (API oficial ou, sem ela, iCal) e Notion e grava espelhos no Supabase.
 * Cada conector só roda se os seus segredos existirem; a falha de um não interrompe os outros.
 *
 * Variáveis (GitHub Actions secrets): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   TRELLO_API_KEY, TRELLO_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
 *   GOOGLE_ICAL_URLS (um endereço por linha), NOTION_TOKEN.
 * O token de longa duração do Google fica no cofre do Supabase, nunca nestas variáveis (ADR 0014).
 */
import { createClient } from '@supabase/supabase-js';
import { aplicar, executarConector, somar } from './motor.js';
import * as trello from './trello.js';
import * as google from './google-ical.js';
import * as agenda from './google.js';
import { lerNotion } from './notion.js';
import { hojeSP, somarDias } from './util.js';

const env = process.env;
const gatilho = env.GITHUB_EVENT_NAME === 'workflow_dispatch' ? 'manual' : 'agendado';

/** Token do Google no cofre. Sem conexão feita, a leitura continua pelo iCal. */
async function tokenDoGoogle(supabase) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  const { data, error } = await supabase.rpc('ler_credencial_servico', { p_ferramenta: 'google' });
  if (error) console.log('Google Agenda: cofre indisponível, usando iCal.');
  return data ?? null;
}

async function principal() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.');
    return 1;
  }
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const resultados = [];

  if (env.TRELLO_API_KEY && env.TRELLO_TOKEN) {
    resultados.push(
      await executarConector(supabase, { ferramenta: 'trello', nome: 'Trello', gatilho }, async () => {
        const idEquipe = await trello.idPessoaEquipe(supabase);
        const { registros, quadros, detalhes } = await trello.lerTrello({ chave: env.TRELLO_API_KEY, token: env.TRELLO_TOKEN }, { idEquipe });
        const r = await aplicar(supabase, { tabela: 'tarefas', fonte: 'trello', registros });
        const canceladas = await trello.cancelarAusentes(supabase, registros.map((x) => x.id_externo));
        const d = detalhes ? await trello.aplicarDetalhes(supabase, detalhes) : null;
        const extra = d ? `; ${trello.QUADRO_DETALHADO}: ${d.membros} membros, ${d.comentarios} comentários, ${d.itens} itens de checklist` : '';
        return { ...r, mensagem: `${quadros} quadros, ${registros.length} cartões, ${canceladas} arquivados/excluídos marcados como cancelados${extra}` };
      }),
    );
  } else console.log('Trello: sem segredos, ignorado.');

  const tokenLongo = await tokenDoGoogle(supabase);
  const hoje = hojeSP();
  const janela = { inicio: somarDias(hoje, -7), fim: somarDias(hoje, 90) };
  const inicioISO = `${janela.inicio}T00:00:00-03:00`;
  const fimISO = `${janela.fim}T00:00:00-03:00`;
  const urls = (env.GOOGLE_ICAL_URLS ?? '').split(/[\r\n,]+/).map((u) => u.trim()).filter(Boolean);
  if (tokenLongo) {
    resultados.push(
      await executarConector(supabase, { ferramenta: 'google_agenda', nome: 'Google Agenda', gatilho }, async () => {
        const acesso = await agenda.tokenDeAcesso({ clienteId: env.GOOGLE_CLIENT_ID, segredo: env.GOOGLE_CLIENT_SECRET, tokenLongo });
        const registros = await agenda.listarEventos(acesso, janela);
        const r = await aplicar(supabase, { tabela: 'eventos', fonte: 'google_agenda', registros });
        const cancelados = await google.cancelarAusentes(supabase, { calendario: agenda.AGENDA, inicioISO, fimISO, idsPresentes: registros.map((x) => x.id_externo) });
        const substituidos = await google.cancelarLeituraIcal(supabase, agenda.AGENDA);
        return { ...r, mensagem: `API oficial, janela ${janela.inicio} a ${janela.fim}, ${cancelados} removidos na origem, ${substituidos} cópias do iCal substituídas` };
      }),
    );
  } else if (urls.length) {
    resultados.push(
      await executarConector(supabase, { ferramenta: 'google_agenda', nome: 'Google Agenda', gatilho }, async () => {
        const parciais = [];
        let cancelados = 0;
        for (const [i, url] of urls.entries()) {
          const { calendario, registros } = await google.lerIcal(url, janela, i);
          parciais.push(await aplicar(supabase, { tabela: 'eventos', fonte: 'google_agenda', registros }));
          cancelados += await google.cancelarAusentes(supabase, { calendario, inicioISO, fimISO, idsPresentes: registros.map((x) => x.id_externo) });
        }
        return { ...somar(...parciais), mensagem: `${urls.length} agenda(s), janela ${janela.inicio} a ${janela.fim}, ${cancelados} removidos na origem` };
      }),
    );
  } else console.log('Google Agenda: sem conexão nem endereços iCal, ignorado.');

  if (env.NOTION_TOKEN) {
    resultados.push(
      await executarConector(supabase, { ferramenta: 'notion', nome: 'Notion', gatilho }, async () => {
        const { tarefas, reunioes, bases, visiveis } = await lerNotion(env.NOTION_TOKEN);
        const r = somar(
          await aplicar(supabase, { tabela: 'tarefas', fonte: 'notion', registros: tarefas }),
          await aplicar(supabase, { tabela: 'reunioes', fonte: 'notion', registros: reunioes }),
        );
        return { ...r, mensagem: `${visiveis} base(s) visível(is); usadas: ${bases.join(', ') || 'nenhuma'}` };
      }),
    );
  } else console.log('Notion: sem token, ignorado.');

  for (const r of resultados) {
    console.log(r.ok ? `OK: lidos ${r.lidos}, criados ${r.criados}, atualizados ${r.atualizados}, iguais ${r.ignorados}. ${r.mensagem ?? ''}` : `ERRO: ${r.mensagem}`);
  }
  return resultados.some((r) => !r.ok) ? 1 : 0;
}

principal()
  .then((codigo) => process.exit(codigo))
  .catch((e) => {
    console.error('Falha geral:', e.message);
    process.exit(1);
  });
