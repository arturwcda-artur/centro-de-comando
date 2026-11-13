/**
 * Gravação nas ferramentas de origem (ADR 0013 e 0017). Escopo deliberadamente mínimo: concluir e,
 * no Trello, criar cartão a partir de comentário. Nunca exclui nem arquiva nada. Quem decide se a tarefa pode ser concluída é a aplicação (RN-48).
 */
import { listaSensivel, statusDaLista } from './trello.js';
import { buscar } from './util.js';

const TRELLO = 'https://api.trello.com/1';

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

const noTrello = ({ chave, token }, caminho, params = {}) =>
  buscar(`${TRELLO}${caminho}?${new URLSearchParams({ ...params, key: chave, token })}`, { headers: { Accept: 'application/json' } }, 'Trello').then((r) => r.json());

async function listasDoQuadro(credenciais, idQuadro) {
  const listas = await noTrello(credenciais, `/boards/${idQuadro}/lists`, { fields: 'name', filter: 'open' });
  return listas.filter((l) => !listaSensivel(l.name)).map((l) => ({ id: l.id, nome: l.name }));
}

/** Listas abertas do quadro do cartão, para escolher onde criar o cartão novo. */
export async function listasDoCartao(credenciais, idCartao) {
  const cartao = await noTrello(credenciais, `/cards/${idCartao}`, { fields: 'idBoard' });
  return listasDoQuadro(credenciais, cartao.idBoard);
}

/** Cria um cartão novo com o texto do comentário. O cartão de origem e o comentário não mudam. */
export async function criarCartaoDeComentario(credenciais, { idCartaoOrigem, idLista, titulo, texto }) {
  const origem = await noTrello(credenciais, `/cards/${idCartaoOrigem}`, { fields: 'idBoard,shortUrl' });
  const listas = await listasDoQuadro(credenciais, origem.idBoard);
  if (!listas.some((l) => l.id === idLista)) throw new Error('A lista escolhida não pertence a este quadro');
  const corpo = new URLSearchParams({ idList: idLista, name: titulo, desc: `${texto}\n\nOrigem: ${origem.shortUrl}`, pos: 'bottom' });
  const auth = new URLSearchParams({ key: credenciais.chave, token: credenciais.token });
  const r = await buscar(`${TRELLO}/cards?${auth}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: corpo }, 'Trello');
  const novo = await r.json();
  return { id: novo.id, url: novo.shortUrl };
}

