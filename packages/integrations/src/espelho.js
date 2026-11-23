/**
 * Quadro pessoal "tarefas" do Trello (RN-49l). Decisão do proprietário em 23/11/2026: toda tarefa
 * criada no sistema, inclusive ação 5W2H, tem um cartão espelho nesse quadro, só com título e data.
 * O sistema continua sendo a fonte da tarefa: o cartão acompanha. A única coisa que volta do Trello
 * é a conclusão (cartão movido para "concluidos" ou de volta para "tarefas").
 * Nunca exclui nem arquiva cartão.
 */
import { QUADRO_PESSOAL, ehQuadroPessoal, statusDaLista } from './trello.js';
import { buscar } from './util.js';

const TRELLO = 'https://api.trello.com/1';
export { QUADRO_PESSOAL, ehQuadroPessoal };

function api({ chave, token }) {
  const url = (caminho, params) => `${TRELLO}${caminho}?${new URLSearchParams({ ...params, key: chave, token })}`;
  const json = (caminho, params, method) =>
    buscar(url(caminho, params), { method, headers: { Accept: 'application/json' } }, 'Trello').then((r) => r.json());
  return {
    ler: (caminho, params = {}) => json(caminho, params, 'GET'),
    criar: (caminho, params) => json(caminho, params, 'POST'),
    alterar: (caminho, params) => json(caminho, params, 'PUT'),
  };
}

/** Quadro pessoal com a lista de abertas (a primeira que não é de concluídos) e a de concluídos. */
export async function lerQuadroPessoal(credenciais) {
  const t = api(credenciais);
  const quadros = await t.ler('/members/me/boards', { filter: 'open', fields: 'name' });
  const quadro = quadros.find((q) => ehQuadroPessoal(q.name));
  if (!quadro) throw new Error(`Quadro "${QUADRO_PESSOAL}" não encontrado no Trello`);
  const listas = await t.ler(`/boards/${quadro.id}/lists`, { fields: 'name', filter: 'open' });
  const concluidos = listas.find((l) => statusDaLista(l.name) === 'concluida');
  const abertos = listas.find((l) => statusDaLista(l.name) !== 'concluida');
  if (!concluidos || !abertos) throw new Error(`O quadro "${QUADRO_PESSOAL}" precisa de uma lista de tarefas e uma de concluídos`);
  return { id: quadro.id, abertos: abertos.id, concluidos: concluidos.id };
}

/** Campos do cartão a partir da tarefa: título, data (18h de Brasília) e lista conforme a situação. */
export function camposDoCartao(tarefa, quadro) {
  const concluida = tarefa.status === 'concluida';
  const campos = { name: tarefa.titulo, idList: concluida ? quadro.concluidos : quadro.abertos, due: tarefa.prazo ? `${tarefa.prazo}T21:00:00.000Z` : '' };
  if (tarefa.prazo) campos.dueComplete = String(concluida);
  return campos;
}

/** Cria o cartão (sem id) ou atualiza o existente. Devolve o id do cartão. */
export async function espelharTarefa(credenciais, quadro, tarefa) {
  const t = api(credenciais);
  const campos = camposDoCartao(tarefa, quadro);
  if (tarefa.trello_cartao_id) {
    await t.alterar(`/cards/${tarefa.trello_cartao_id}`, campos);
    return tarefa.trello_cartao_id;
  }
  const { due, ...resto } = campos;
  const novo = await t.criar('/cards', { ...resto, ...(due ? { due } : {}), pos: 'top' });
  return novo.id;
}

/** Comentário no cartão, usado para a saída/decisão registrada ao concluir. */
export async function comentarNoCartao(credenciais, idCartao, texto) {
  await api(credenciais).criar(`/cards/${idCartao}/actions/comments`, { text: texto.slice(0, 16000) });
}

/**
 * Quem vale quando cartão e tarefa discordam sobre a conclusão: o lado alterado por último.
 * Devolve 'sistema' (a tarefa segue o cartão), 'trello' (o cartão segue a tarefa) ou null (já batem).
 */
export function quemPrevalece(tarefa, cartao, quadro) {
  const cartaoConcluido = cartao.idList === quadro.concluidos || !!cartao.dueComplete;
  if (cartaoConcluido === (tarefa.status === 'concluida')) return null;
  return (cartao.dateLastActivity ?? '') > (tarefa.atualizado_em ?? '') ? 'sistema' : 'trello';
}

const COLUNAS = 'id, titulo, prazo, status, atualizado_em, trello_cartao_id';

/**
 * Na sincronização: traz do Trello as conclusões feitas lá, leva ao Trello o que mudou aqui e
 * cria o cartão das tarefas abertas que ainda não têm (inclusive as antigas e as que falharam).
 */
export async function sincronizarQuadroPessoal(supabase, credenciais) {
  const t = api(credenciais);
  const quadro = await lerQuadroPessoal(credenciais);
  const cartoes = await t.ler(`/boards/${quadro.id}/cards`, { filter: 'open', fields: 'idList,dueComplete,dateLastActivity' });
  const porId = new Map(cartoes.map((c) => [c.id, c]));
  const { data: tarefas, error } = await supabase.from('tarefas').select(COLUNAS).eq('fonte', 'manual').neq('status', 'cancelada');
  if (error) throw new Error(`leitura de tarefas: ${error.message}`);

  const r = { criados: 0, levados: 0, trazidos: 0 };
  for (const tarefa of tarefas) {
    if (!tarefa.trello_cartao_id) {
      if (tarefa.status === 'concluida') continue;
      const id = await espelharTarefa(credenciais, quadro, tarefa);
      const { error: e } = await supabase.from('tarefas').update({ trello_cartao_id: id }).eq('id', tarefa.id);
      if (e) throw new Error(`vínculo do cartão: ${e.message}`);
      r.criados += 1;
      continue;
    }
    const cartao = porId.get(tarefa.trello_cartao_id);
    if (!cartao) continue; // arquivado ou excluído no Trello: a tarefa segue só aqui
    const lado = quemPrevalece(tarefa, cartao, quadro);
    if (lado === 'trello') {
      await espelharTarefa(credenciais, quadro, tarefa);
      r.levados += 1;
    } else if (lado === 'sistema') {
      const concluir = tarefa.status !== 'concluida';
      const { error: e } = await supabase
        .from('tarefas')
        .update(concluir ? { status: 'concluida', concluida_em: cartao.dateLastActivity ?? new Date().toISOString() } : { status: 'a_fazer', concluida_em: null })
        .eq('id', tarefa.id);
      if (e) throw new Error(`conclusão vinda do Trello: ${e.message}`);
      r.trazidos += 1;
    }
  }
  return r;
}
