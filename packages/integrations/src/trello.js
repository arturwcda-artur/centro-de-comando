/**
 * Conector Trello — SOMENTE LEITURA (só requisições GET; ADR 0005 e 0012).
 * Fonte oficial das tarefas operacionais de equipe (ADR 0004).
 */
import { buscar, cortar, dataSP } from './util.js';

const API = 'https://api.trello.com/1';
export const PESSOA_EQUIPE = 'Equipe (Trello)';

function chamar(caminho, { chave, token }, params = {}) {
  const qs = new URLSearchParams({ ...params, key: chave, token });
  return buscar(`${API}${caminho}?${qs}`, { headers: { Accept: 'application/json' } }, `Trello ${caminho.split('/')[1]}`).then((r) => r.json());
}

/**
 * Listas que nunca entram no sistema (RN-66): credenciais não devem ser copiadas para o banco,
 * o histórico de auditoria ou os backups. Os cartões seguem intactos no Trello.
 */
export function listaSensivel(nomeLista) {
  const n = (nomeLista ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return /senha|password|credencia|\blogin|\btoken/.test(n);
}

/** Situação a partir da lista em que o cartão está (o nome da lista é a convenção do quadro). */
export function statusDaLista(nomeLista) {
  const n = (nomeLista ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (/conclu|feito|finaliz|entregue|\bdone\b/.test(n)) return 'concluida';
  if (/andamento|fazendo|execu|doing|progresso/.test(n)) return 'em_andamento';
  return 'a_fazer';
}

/**
 * Cartão → tarefa espelho.
 * Cartões em que o proprietário é membro (ou sem membros) ficam sem responsável = "minhas" (RN-45);
 * os demais vão para a pessoa "Equipe (Trello)", para não lotar "Minhas atribuições".
 */
export function mapearCartao(cartao, { quadro, lista, meuId, idEquipe }) {
  const status = cartao.dueComplete ? 'concluida' : statusDaLista(lista);
  const meu = !cartao.idMembers?.length || cartao.idMembers.includes(meuId);
  return {
    id_externo: cartao.id,
    titulo: cortar(cartao.name, 300) ?? '(cartão sem título)',
    descricao: cortar([cartao.desc, cartao.url].filter(Boolean).join('\n\n'), 4000),
    prazo: dataSP(cartao.due),
    status,
    concluida_em: status === 'concluida' ? (cartao.dateLastActivity ?? new Date().toISOString()) : null,
    categoria: cortar(`${quadro} › ${lista ?? '—'}`, 100),
    responsavel_id: meu ? null : idEquipe,
    atualizado_em_origem: cartao.dateLastActivity ?? null,
  };
}

/** Lê todos os quadros abertos do usuário e devolve as tarefas mapeadas. */
export async function lerTrello(credenciais, { idEquipe }) {
  const eu = await chamar('/members/me', credenciais, { fields: 'id' });
  const quadros = await chamar('/members/me/boards', credenciais, { filter: 'open', fields: 'name' });
  const registros = [];
  for (const q of quadros) {
    const [listas, cartoes] = await Promise.all([
      chamar(`/boards/${q.id}/lists`, credenciais, { fields: 'name', filter: 'all' }),
      chamar(`/boards/${q.id}/cards`, credenciais, { filter: 'open', fields: 'name,desc,due,dueComplete,idList,idMembers,url,dateLastActivity' }),
    ]);
    const nomeLista = new Map(listas.map((l) => [l.id, l.name]));
    for (const c of cartoes) {
      const lista = nomeLista.get(c.idList);
      if (listaSensivel(lista)) continue;
      registros.push(mapearCartao(c, { quadro: q.name, lista, meuId: eu.id, idEquipe }));
    }
  }
  return { registros, quadros: quadros.length };
}

/** Garante a pessoa "Equipe (Trello)" usada nos cartões atribuídos a outros membros. */
export async function idPessoaEquipe(supabase) {
  const { data } = await supabase.from('pessoas').select('id').eq('nome', PESSOA_EQUIPE).is('arquivado_em', null).limit(1).maybeSingle();
  if (data) return data.id;
  const { data: nova, error } = await supabase.from('pessoas').insert({ nome: PESSOA_EQUIPE, funcao: 'Cartões do Trello atribuídos a outros membros' }).select('id').single();
  if (error) throw new Error(`pessoa da equipe: ${error.message}`);
  return nova.id;
}

/**
 * Cartões que deixaram de existir entre os abertos (arquivados/excluídos no Trello)
 * viram "cancelada" no espelho — nunca são apagados.
 */
export async function cancelarAusentes(supabase, idsPresentes) {
  const { data, error } = await supabase.from('tarefas').select('id, id_externo').eq('fonte', 'trello').not('status', 'in', '(concluida,cancelada)');
  if (error) throw new Error(`leitura de tarefas do Trello: ${error.message}`);
  const presentes = new Set(idsPresentes);
  const ausentes = data.filter((t) => !presentes.has(t.id_externo)).map((t) => t.id);
  if (ausentes.length) {
    // hash nulo: se o cartão voltar (desarquivado), a próxima sincronização o regrava
    const { error: e2 } = await supabase.from('tarefas').update({ status: 'cancelada', status_sync: 'sincronizado', hash_conteudo: null }).in('id', ausentes);
    if (e2) throw new Error(`cancelamento de cartões ausentes: ${e2.message}`);
  }
  return ausentes.length;
}
