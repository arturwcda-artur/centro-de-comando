/**
 * Sincronizador — executado pelo GitHub Actions a cada hora (ADR 0012) ou manualmente.
 * Lê Trello, Google Agenda (iCal) e Notion e grava espelhos no Supabase.
 * Cada conector só roda se os seus segredos existirem; a falha de um não interrompe os outros.
 *
 * Variáveis (GitHub Actions secrets): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   TRELLO_API_KEY, TRELLO_TOKEN, GOOGLE_ICAL_URLS (um endereço por linha), NOTION_TOKEN.
 */
import { createClient } from '@supabase/supabase-js';
import { aplicar, executarConector, somar } from './motor.js';
import * as trello from './trello.js';
import * as google from './google-ical.js';
import { lerNotion } from './notion.js';
import { hojeSP, somarDias } from './util.js';

const env = process.env;
const gatilho = env.GITHUB_EVENT_NAME === 'workflow_dispatch' ? 'manual' : 'agendado';

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
        const { registros, quadros } = await trello.lerTrello({ chave: env.TRELLO_API_KEY, token: env.TRELLO_TOKEN }, { idEquipe });
        const r = await aplicar(supabase, { tabela: 'tarefas', fonte: 'trello', registros });
        const canceladas = await trello.cancelarAusentes(supabase, registros.map((x) => x.id_externo));
        return { ...r, mensagem: `${quadros} quadros, ${registros.length} cartões abertos, ${canceladas} arquivados/excluídos marcados como cancelados` };
      }),
    );
  } else console.log('Trello: sem segredos, ignorado.');

  const urls = (env.GOOGLE_ICAL_URLS ?? '').split(/[\r\n,]+/).map((u) => u.trim()).filter(Boolean);
  if (urls.length) {
    resultados.push(
      await executarConector(supabase, { ferramenta: 'google_agenda', nome: 'Google Agenda', gatilho }, async () => {
        const hoje = hojeSP();
        const janela = { inicio: somarDias(hoje, -7), fim: somarDias(hoje, 90) };
        const parciais = [];
        let cancelados = 0;
        for (const [i, url] of urls.entries()) {
          const { calendario, registros } = await google.lerIcal(url, janela, i);
          parciais.push(await aplicar(supabase, { tabela: 'eventos', fonte: 'google_agenda', registros }));
          cancelados += await google.cancelarAusentes(supabase, {
            calendario,
            inicioISO: `${janela.inicio}T00:00:00-03:00`,
            fimISO: `${janela.fim}T00:00:00-03:00`,
            idsPresentes: registros.map((x) => x.id_externo),
          });
        }
        return { ...somar(...parciais), mensagem: `${urls.length} agenda(s), janela ${janela.inicio} a ${janela.fim}, ${cancelados} removidos na origem` };
      }),
    );
  } else console.log('Google Agenda: sem endereços iCal, ignorado.');

  if (env.NOTION_TOKEN) {
    resultados.push(
      await executarConector(supabase, { ferramenta: 'notion', nome: 'Notion', gatilho }, async () => {
        const { tarefas, reunioes, bases } = await lerNotion(env.NOTION_TOKEN);
        const r = somar(
          await aplicar(supabase, { tabela: 'tarefas', fonte: 'notion', registros: tarefas }),
          await aplicar(supabase, { tabela: 'reunioes', fonte: 'notion', registros: reunioes }),
        );
        return { ...r, mensagem: bases.length ? `bases: ${bases.join(', ')}` : 'nenhuma base compartilhada com a integração' };
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
