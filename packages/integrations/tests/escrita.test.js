import { afterEach, describe, expect, it, vi } from 'vitest';
import { concluirCartaoTrello } from '../src/escrita.js';

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

