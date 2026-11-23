import { afterEach, describe, expect, it, vi } from 'vitest';
import { lerTrello } from '../src/trello.js';
import { camposDoCartao, ehQuadroPessoal, quemPrevalece, sincronizarQuadroPessoal } from '../src/espelho.js';

// Dados de TESTE no formato da API. Nenhuma chamada real é feita.
const cred = { chave: 'k', token: 't' };
const quadro = { id: 'Q', abertos: 'L1', concluidos: 'L2' };
afterEach(() => vi.unstubAllGlobals());

function apiFalsa(rotas) {
  const chamadas = [];
  vi.stubGlobal('fetch', async (url, opcoes = {}) => {
    const u = new URL(String(url));
    const metodo = opcoes.method ?? 'GET';
    chamadas.push({ caminho: u.pathname, params: u.searchParams, metodo });
    const rota = Object.keys(rotas).find((r) => `${metodo} ${u.pathname}`.endsWith(r));
    if (!rota) throw new Error(`rota não prevista: ${metodo} ${u.pathname}`);
    const resposta = typeof rotas[rota] === 'function' ? rotas[rota](u.searchParams) : rotas[rota];
    return new Response(JSON.stringify(resposta), { status: 200 });
  });
  return chamadas;
}

/** Banco falso: guarda as tarefas e as alterações pedidas. */
function bancoFalso(tarefas) {
  const alteracoes = [];
  return {
    alteracoes,
    from: () => ({
      select: () => ({ eq: () => ({ neq: async () => ({ data: tarefas, error: null }) }) }),
      update: (valores) => ({ eq: async (_, id) => (alteracoes.push({ id, ...valores }), { error: null }) }),
    }),
  };
}

describe('quadro pessoal', () => {
  it('reconhece o quadro "tarefas" sem confundir com outros', () => {
    expect(ehQuadroPessoal('tarefas')).toBe(true);
    expect(ehQuadroPessoal(' Tarefas ')).toBe(true);
    expect(ehQuadroPessoal('Tarefas Brasal')).toBe(false);
  });

  it('cartão leva só título, data e a lista conforme a situação', () => {
    expect(camposDoCartao({ titulo: 'A', prazo: '2026-11-30', status: 'a_fazer' }, quadro)).toEqual({ name: 'A', idList: 'L1', due: '2026-11-30T21:00:00.000Z', dueComplete: 'false' });
    expect(camposDoCartao({ titulo: 'B', prazo: null, status: 'concluida' }, quadro)).toEqual({ name: 'B', idList: 'L2', due: '' });
  });

  it('vale o lado alterado por último', () => {
    const aberta = { status: 'a_fazer', atualizado_em: '2026-11-20T10:00:00Z' };
    expect(quemPrevalece(aberta, { idList: 'L1' }, quadro)).toBeNull();
    expect(quemPrevalece(aberta, { idList: 'L2', dateLastActivity: '2026-11-21T10:00:00Z' }, quadro)).toBe('sistema');
    expect(quemPrevalece({ status: 'concluida', atualizado_em: '2026-11-22T10:00:00Z' }, { idList: 'L1', dateLastActivity: '2026-11-21T10:00:00Z' }, quadro)).toBe('trello');
  });
});

describe('sincronizarQuadroPessoal', () => {
  it('cria o cartão da tarefa aberta, traz a conclusão do Trello e ignora concluída sem cartão', async () => {
    const chamadas = apiFalsa({
      'GET /1/members/me/boards': [{ id: 'Q', name: 'tarefas' }],
      'GET /1/boards/Q/lists': [{ id: 'L1', name: 'tarefas' }, { id: 'L2', name: 'concluidos' }],
      'GET /1/boards/Q/cards': [{ id: 'C2', idList: 'L2', dateLastActivity: '2026-11-23T12:00:00Z' }],
      'POST /1/cards': { id: 'C1' },
    });
    const banco = bancoFalso([
      { id: 't1', titulo: 'Nova', prazo: null, status: 'a_fazer', trello_cartao_id: null, atualizado_em: '2026-11-23T10:00:00Z' },
      { id: 't2', titulo: 'Feita no Trello', prazo: null, status: 'a_fazer', trello_cartao_id: 'C2', atualizado_em: '2026-11-22T10:00:00Z' },
      { id: 't3', titulo: 'Antiga', prazo: null, status: 'concluida', trello_cartao_id: null, atualizado_em: '2026-11-01T10:00:00Z' },
    ]);
    const r = await sincronizarQuadroPessoal(banco, cred);
    expect(r).toEqual({ criados: 1, levados: 0, trazidos: 1 });
    expect(banco.alteracoes).toEqual([
      { id: 't1', trello_cartao_id: 'C1' },
      { id: 't2', status: 'concluida', concluida_em: '2026-11-23T12:00:00Z' },
    ]);
    expect(chamadas.filter((c) => c.metodo !== 'GET')).toHaveLength(1);
    expect(chamadas.some((c) => c.metodo === 'DELETE')).toBe(false);
  });

  it('falha clara sem a lista de concluídos', async () => {
    apiFalsa({
      'GET /1/members/me/boards': [{ id: 'Q', name: 'tarefas' }],
      'GET /1/boards/Q/lists': [{ id: 'L1', name: 'tarefas' }],
    });
    await expect(sincronizarQuadroPessoal(bancoFalso([]), cred)).rejects.toThrow('uma de concluídos');
  });
});

describe('lerTrello com o quadro pessoal', () => {
  it('importa os cartões do quadro tarefas, menos os espelhos', async () => {
    apiFalsa({
      'GET /1/members/me': { id: 'eu' },
      'GET /1/members/me/boards': [{ id: 'Q', name: 'tarefas' }],
      'GET /1/boards/Q/lists': [{ id: 'L1', name: 'tarefas' }],
      'GET /1/boards/Q/cards': [
        { id: 'antigo', name: 'Cartão antigo', idList: 'L1', idMembers: [] },
        { id: 'espelho', name: 'Tarefa do sistema', idList: 'L1', idMembers: [] },
      ],
    });
    const { registros } = await lerTrello(cred, { idEquipe: 'e', espelhos: new Set(['espelho']) });
    expect(registros.map((r) => r.id_externo)).toEqual(['antigo']);
  });
});
