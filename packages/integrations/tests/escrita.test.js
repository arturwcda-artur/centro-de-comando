import { afterEach, describe, expect, it, vi } from 'vitest';
import { concluirCartaoTrello, criarCartaoNoQuadro } from '../src/escrita.js';

// Respostas de TESTE no formato das APIs. Nenhuma chamada real é feita.
function apiFalsa(rotas) {
  const chamadas = [];
  vi.stubGlobal('fetch', async (url, opcoes = {}) => {
    const u = new URL(url);
    const metodo = opcoes.method ?? 'GET';
    chamadas.push({ metodo, caminho: u.pathname, params: Object.fromEntries(u.searchParams), corpo: opcoes.body ? JSON.parse(opcoes.body) : null });
    const resposta = rotas[`${metodo} ${u.pathname}`];
    if (resposta === undefined) return new Response('{}', { status: 404 });
    return new Response(JSON.stringify(resposta), { status: 200 });
  });
  return chamadas;
}
const cred = { chave: 'k', token: 't' };
const escritas = (chamadas) => chamadas.filter((c) => c.metodo !== 'GET');

afterEach(() => vi.unstubAllGlobals());

describe('concluir no Trello', () => {
  const listas = [{ id: 'l1', name: 'A fazer' }, { id: 'l2', name: 'concluidos' }];

  it('move para a lista de concluídos do quadro e marca o prazo, se houver', async () => {
    const c = apiFalsa({ 'GET /1/cards/c1': { idBoard: 'b1', idList: 'l1', due: '2026-11-01T12:00:00Z' }, 'GET /1/boards/b1/lists': listas, 'PUT /1/cards/c1': {} });
    expect(await concluirCartaoTrello(cred, 'c1')).toBe('Cartão movido para a lista "concluidos"');
    expect(escritas(c)).toHaveLength(1);
    expect(escritas(c)[0].params).toMatchObject({ idList: 'l2', dueComplete: 'true' });
  });

  it('sem lista de concluídos, marca no próprio cartão e não muda de lista', async () => {
    const c = apiFalsa({ 'GET /1/cards/c2': { idBoard: 'b2', idList: 'l9', due: null }, 'GET /1/boards/b2/lists': [{ id: 'l9', name: 'Meta 2026' }], 'PUT /1/cards/c2': {} });
    expect(await concluirCartaoTrello(cred, 'c2')).toBe('Cartão marcado como concluído');
    const { params } = escritas(c)[0];
    expect(params.dueComplete).toBe('true');
    expect(params.idList).toBeUndefined();
  });

  it('nunca exclui nem arquiva', async () => {
    const c = apiFalsa({ 'GET /1/cards/c1': { idBoard: 'b1', idList: 'l1', due: null }, 'GET /1/boards/b1/lists': listas, 'PUT /1/cards/c1': {} });
    await concluirCartaoTrello(cred, 'c1');
    expect(c.some((x) => x.metodo === 'DELETE')).toBe(false);
    expect(escritas(c)[0].params.closed).toBeUndefined();
  });

  it('falha da API vira erro (a tarefa não pode aparecer concluída)', async () => {
    apiFalsa({});
    await expect(concluirCartaoTrello(cred, 'x')).rejects.toThrow(/Trello: HTTP 404/);
  });
});


describe('cartão a partir de ação 5W2H', () => {
  const base = {
    'GET /1/members/me/boards': [{ id: 'b1', name: 'Obras do Grupo - C.SALLES' }],
    'GET /1/boards/b1/lists': [{ id: 'l1', name: 'NILLS' }, { id: 'l2', name: 'Senhas' }],
    'POST /1/cards': { id: 'c9', shortUrl: 'https://trello.com/c/x' },
  };

  it('cria o cartão com membro, prazo e a etiqueta que já existe', async () => {
    const c = apiFalsa({ ...base, 'GET /1/boards/b1/labels': [{ id: 'e1', name: 'Prioridade Alta', color: 'red' }] });
    const r = await criarCartaoNoQuadro(cred, { nomeQuadro: 'Obras do Grupo - C.SALLES', idLista: 'l1', titulo: 'Cotar telhas', descricao: 'Por quê: x', prazo: '2026-11-20', idMembro: 'm1', prioridade: 'alta' });
    expect(r).toEqual({ id: 'c9', url: 'https://trello.com/c/x', lista: 'NILLS' });
    expect(escritas(c)).toHaveLength(1);
    expect(escritas(c)[0].params).toMatchObject({ idList: 'l1', name: 'Cotar telhas', idMembers: 'm1', idLabels: 'e1', due: '2026-11-20T21:00:00.000Z' });
  });

  it('cria a etiqueta de prioridade quando o quadro não tem', async () => {
    const c = apiFalsa({ ...base, 'GET /1/boards/b1/labels': [], 'POST /1/labels': { id: 'e2' } });
    await criarCartaoNoQuadro(cred, { nomeQuadro: 'Obras do Grupo - C.SALLES', idLista: 'l1', titulo: 'T', prioridade: 'baixa' });
    expect(escritas(c).map((x) => x.caminho)).toEqual(['/1/labels', '/1/cards']);
    expect(escritas(c)[0].params).toMatchObject({ name: 'Prioridade baixa', color: 'green', idBoard: 'b1' });
    expect(escritas(c)[1].params.idLabels).toBe('e2');
  });

  it('recusa lista de outro quadro ou lista sensível, sem gravar nada', async () => {
    const c = apiFalsa(base);
    await expect(criarCartaoNoQuadro(cred, { nomeQuadro: 'Obras do Grupo - C.SALLES', idLista: 'l2', titulo: 'T' })).rejects.toThrow('não pertence');
    expect(escritas(c)).toHaveLength(0);
  });
});
