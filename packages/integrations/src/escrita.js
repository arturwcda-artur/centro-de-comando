/**
 * Gravação nas ferramentas de origem (ADR 0013). Escopo deliberadamente mínimo: só CONCLUIR.
 * Nunca exclui nem arquiva nada. Quem decide se a tarefa pode ser concluída é a aplicação (RN-48).
 */
import { statusDaLista } from './trello.js';
import { buscar } from './util.js';

const TRELLO = 'https://api.trello.com/1';
const NOTION = 'https://api.notion.com/v1';
const VERSAO_NOTION = '2025-09-03';

const semAcento = (t) => (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Trello: move o cartão para a lista de concluídos do quadro; sem essa lista, marca o prazo como
 * concluído. Em ambos os casos o sincronizador passa a ler o cartão como concluído.
 */
export async function concluirCartaoTrello({ chave, token }, idCartao) {
  const auth = new URLSearchParams({ key: chave, token });
  const ler = (caminho, params) =>
    buscar(`${TRELLO}${caminho}?${new URLSearchParams(params)}&${auth}`, { headers: { Accept: 'application/json' } }, 'Trello').then((r) => r.json());

  const cartao = await ler(`/cards/${idCartao}`, { fields: 'idBoard,idList,due' });
  const listas = await ler(`/boards/${cartao.idBoard}/lists`, { fields: 'name', filter: 'open' });
  const destino = listas.find((l) => statusDaLista(l.name) === 'concluida');

  const mudancas = destino ? { idList: destino.id } : {};
  if (cartao.due || !destino) mudancas.dueComplete = 'true';
  if (!cartao.due && !destino) mudancas.due = new Date().toISOString(); // dueComplete exige um prazo

  await buscar(`${TRELLO}/cards/${idCartao}?${new URLSearchParams(mudancas)}&${auth}`, { method: 'PUT', headers: { Accept: 'application/json' } }, 'Trello');
  return destino ? `Cartão movido para a lista "${destino.name}"` : 'Cartão marcado como concluído';
}

/** Notion: muda a propriedade de situação da página para a opção de concluído da própria base. */
export async function concluirPaginaNotion(token, idPagina) {
  const headers = { Authorization: `Bearer ${token}`, 'Notion-Version': VERSAO_NOTION, 'Content-Type': 'application/json' };
  const pagina = await buscar(`${NOTION}/pages/${idPagina}`, { headers }, 'Notion').then((r) => r.json());

  const entrada = Object.entries(pagina.properties ?? {}).find(([, p]) => p.type === 'status') ?? Object.entries(pagina.properties ?? {}).find(([nome, p]) => p.type === 'select' && /status|situa|etapa/i.test(nome));
  if (!entrada) throw new Error('A base do Notion não tem propriedade de situação');
  const [nome, propriedade] = entrada;

  const idBase = pagina.parent?.data_source_id;
  if (!idBase) throw new Error('Página do Notion fora de uma base');
  const base = await buscar(`${NOTION}/data_sources/${idBase}`, { headers }, 'Notion').then((r) => r.json());
  const opcoes = base.properties?.[nome]?.[propriedade.type]?.options ?? [];
  const concluida = opcoes.find((o) => /conclu|feito|finaliz|done|resolvid|encerr/.test(semAcento(o.name)));
  if (!concluida) throw new Error(`A propriedade "${nome}" não tem opção de concluído`);

  await buscar(
    `${NOTION}/pages/${idPagina}`,
    { method: 'PATCH', headers, body: JSON.stringify({ properties: { [nome]: { [propriedade.type]: { name: concluida.name } } } }) },
    'Notion',
  );
  return `Situação alterada para "${concluida.name}"`;
}
