import { afterEach, describe, expect, it, vi } from 'vitest';
import { concluirCartaoTrello, concluirPaginaNotion, criarDemandaNotion } from '../src/escrita.js';

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

describe('concluir no Notion', () => {
  const pagina = { parent: { data_source_id: 'ds1' }, properties: { Status: { type: 'status', status: { name: 'A fazer' } }, Nome: { type: 'title', title: [] } } };

  it('usa a opção de concluído da própria base', async () => {
    const c = apiFalsa({
      'GET /v1/pages/p1': pagina,
      'GET /v1/data_sources/ds1': { properties: { Status: { status: { options: [{ name: 'A fazer' }, { name: 'Concluído' }] } } } },
      'PATCH /v1/pages/p1': {},
    });
    expect(await concluirPaginaNotion('t', 'p1')).toBe('Situação alterada para "Concluído"');
    expect(escritas(c)[0].corpo).toEqual({ properties: { Status: { status: { name: 'Concluído' } } } });
  });

  it('sem opção de concluído, recusa em vez de chutar', async () => {
    const c = apiFalsa({ 'GET /v1/pages/p1': pagina, 'GET /v1/data_sources/ds1': { properties: { Status: { status: { options: [{ name: 'A fazer' }] } } } } });
    await expect(concluirPaginaNotion('t', 'p1')).rejects.toThrow(/não tem opção de concluído/);
    expect(escritas(c)).toHaveLength(0);
  });

  it('base sem propriedade de situação é recusada', async () => {
    apiFalsa({ 'GET /v1/pages/p2': { parent: { data_source_id: 'ds1' }, properties: { Nome: { type: 'title', title: [] } } } });
    await expect(concluirPaginaNotion('t', 'p2')).rejects.toThrow(/propriedade de situação/);
  });
});

describe('criar demanda no Notion', () => {
  it('cria na base certa, como Pendente, sem enviar campo vazio', async () => {
    let enviado;
    vi.stubGlobal('fetch', async (url, opcoes) => {
      enviado = { url: String(url), corpo: JSON.parse(opcoes.body) };
      return new Response(JSON.stringify({ id: 'p1', url: 'https://notion/p1' }), { status: 200 });
    });
    const r = await criarDemandaNotion('t', { titulo: 'Revisar', prazo: null, prioridade: '🟠 Alta', categoria: 'Obras', responsavel: null, observacoes: null });
    vi.unstubAllGlobals();
    expect(r).toEqual({ id: 'p1', url: 'https://notion/p1' });
    expect(enviado.url).toMatch(/\/pages$/);
    expect(enviado.corpo.parent.data_source_id).toBe('eaa80b95-7806-4a12-810b-f18195743cc0');
    expect(enviado.corpo.properties.Status.select.name).toBe('🟡 Pendente');
    expect(enviado.corpo.properties).not.toHaveProperty('Prazo');
  });
});
