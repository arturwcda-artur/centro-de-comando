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


/** Etiquetas de prioridade usadas nos cartões criados pelo sistema (cor do Trello). */
export const PRIORIDADES_TRELLO = { alta: { nome: 'Prioridade alta', cor: 'red' }, media: { nome: 'Prioridade média', cor: 'yellow' }, baixa: { nome: 'Prioridade baixa', cor: 'green' } };

async function quadroPorNome(credenciais, nomeQuadro) {
  const quadros = await noTrello(credenciais, '/members/me/boards', { filter: 'open', fields: 'name' });
  const quadro = quadros.find((q) => q.name === nomeQuadro);
  if (!quadro) throw new Error(`Quadro "${nomeQuadro}" não encontrado no Trello`);
  return quadro;
}

/** Listas abertas de um quadro, procurado pelo nome. */
export async function listasDoQuadroPorNome(credenciais, nomeQuadro) {
  const quadro = await quadroPorNome(credenciais, nomeQuadro);
  return listasDoQuadro(credenciais, quadro.id);
}

/**
 * Cria um cartão a partir de uma ação 5W2H (RN-49k): lista, membro, prazo e etiqueta de prioridade.
 * A etiqueta é reaproveitada pelo nome; se o quadro ainda não tiver, é criada. Nada é excluído.
 */
export async function criarCartaoNoQuadro(credenciais, { nomeQuadro, idLista, titulo, descricao, prazo, idMembro, prioridade }) {
  const quadro = await quadroPorNome(credenciais, nomeQuadro);
  const listas = await listasDoQuadro(credenciais, quadro.id);
  if (!listas.some((l) => l.id === idLista)) throw new Error('A lista escolhida não pertence a este quadro');
  const auth = { key: credenciais.chave, token: credenciais.token };
  const postar = (caminho, params) =>
    buscar(`${TRELLO}${caminho}?${new URLSearchParams({ ...params, ...auth })}`, { method: 'POST', headers: { Accept: 'application/json' } }, 'Trello').then((r) => r.json());

  const params = { idList: idLista, name: titulo, desc: (descricao ?? '').slice(0, 3000), pos: 'top' };
  if (prazo) params.due = `${prazo}T21:00:00.000Z`; // 18:00 em Brasília
  if (idMembro) params.idMembers = idMembro;
  const etiqueta = PRIORIDADES_TRELLO[prioridade];
  if (etiqueta) {
    const existentes = await noTrello(credenciais, `/boards/${quadro.id}/labels`, { fields: 'name,color' });
    const achada = existentes.find((l) => semAcento(l.name) === semAcento(etiqueta.nome));
    const usada = achada ?? (await postar('/labels', { name: etiqueta.nome, color: etiqueta.cor, idBoard: quadro.id }));
    params.idLabels = usada.id;
  }
  const novo = await postar('/cards', params);
  return { id: novo.id, url: novo.shortUrl, lista: listas.find((l) => l.id === idLista).nome };
}
