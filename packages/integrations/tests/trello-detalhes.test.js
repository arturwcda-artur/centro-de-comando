import { afterEach, describe, expect, it, vi } from 'vitest';
import { criarCartaoDeComentario, listasDoCartao } from '../src/escrita.js';
import { QUADRO_DETALHADO, aplicarDetalhes, cartaoImportavel, lerDetalhes, textoSensivel } from '../src/trello.js';

// Dados de TESTE no formato da API. Nenhuma chamada real é feita.
const cred = { chave: 'k', token: 't' };
afterEach(() => vi.unstubAllGlobals());

function apiFalsa(rotas) {
  const chamadas = [];
  vi.stubGlobal('fetch', async (url, opcoes = {}) => {
    const u = new URL(String(url));
    chamadas.push({ caminho: u.pathname, params: u.searchParams, metodo: opcoes.method ?? 'GET', corpo: opcoes.body ? new URLSearchParams(opcoes.body) : null });
    const rota = Object.keys(rotas).find((r) => u.pathname.endsWith(r));
    if (!rota) throw new Error(`rota não prevista: ${u.pathname}`);
    const resposta = typeof rotas[rota] === 'function' ? rotas[rota](u.searchParams) : rotas[rota];
    return new Response(JSON.stringify(resposta), { status: 200 });
  });
  return chamadas;
}

describe('quadro detalhado', () => {
  it('é só o quadro combinado', () => {
    expect(QUADRO_DETALHADO).toBe('Obras do Grupo - C.SALLES');
  });
});

describe('cartaoImportavel', () => {
  it('cartão aberto entra; arquivado só se estava concluído', () => {
    expect(cartaoImportavel({ closed: false }, 'A fazer')).toBe(true);
    expect(cartaoImportavel({ closed: true }, '6. CONCLUÍDO')).toBe(true);
    expect(cartaoImportavel({ closed: true, dueComplete: true }, 'A fazer')).toBe(true);
    expect(cartaoImportavel({ closed: true }, 'A fazer')).toBe(false);
  });
});

describe('textoSensivel', () => {
  it('reconhece credencial escrita no texto', () => {
    expect(textoSensivel('senha: abc')).toBe(true);
    expect(textoSensivel('Password = 123')).toBe(true);
    expect(textoSensivel('a senha do portão foi trocada')).toBe(false);
    expect(textoSensivel('Conferir armadura')).toBe(false);
  });
});

describe('lerDetalhes', () => {
  const rotas = {
    '/members': [{ id: 'm1', fullName: 'Pessoa Um', username: 'um' }],
    '/checklists': [{ id: 'l1', name: 'Vistoria', idCard: 'c1', checkItems: [{ id: 'i1', name: 'Fôrma', state: 'complete', pos: 1 }, { id: 'i2', name: 'senha: 123', state: 'incomplete', pos: 2 }] }],
    '/actions': [
      { id: 'a1', date: '2026-11-01T12:00:00.000Z', data: { text: 'Concreto liberado', card: { id: 'c1' } }, memberCreator: { fullName: 'Pessoa Um' } },
      { id: 'a2', date: '2026-11-02T12:00:00.000Z', data: { text: 'senha: 999', card: { id: 'c1' } }, memberCreator: { fullName: 'Pessoa Um' } },
    ],
  };

  it('lê membros, itens e comentários, sem copiar texto sensível', async () => {
    apiFalsa(rotas);
    const d = await lerDetalhes(cred, 'q1');
    expect(d.membros).toEqual([{ id_externo: 'm1', nome: 'Pessoa Um', usuario: 'um' }]);
    expect(d.itens).toEqual([{ id_externo: 'i1', cartao: 'c1', checklist: 'Vistoria', nome: 'Fôrma', concluido: true, posicao: 1 }]);
    expect(d.comentarios).toEqual([{ id_externo: 'a1', cartao: 'c1', autor: 'Pessoa Um', texto: 'Concreto liberado', data: '2026-11-01T12:00:00.000Z' }]);
  });

  it('percorre todas as páginas de comentários', async () => {
    const pagina = Array.from({ length: 1000 }, (_, i) => ({ id: `a${i}`, date: '2026-11-01T12:00:00.000Z', data: { text: 'ok', card: { id: 'c1' } }, memberCreator: { fullName: 'X' } }));
    const c = apiFalsa({ ...rotas, '/actions': (p) => (p.get('before') ? [{ id: 'z', date: '2026-10-01T12:00:00.000Z', data: { text: 'antigo', card: { id: 'c1' } }, memberCreator: { fullName: 'X' } }] : pagina) });
    const d = await lerDetalhes(cred, 'q1');
    expect(d.comentarios).toHaveLength(1001);
    expect(c.filter((x) => x.caminho.endsWith('/actions')).at(-1).params.get('before')).toBe('a999');
  });
});

/** Supabase simulado em memória, só com o que aplicarDetalhes usa. */
function bancoFalso(inicial) {
  const tabelas = structuredClone(inicial);
  const consulta = (nome) => {
    const filtros = [];
    const q = {
      select: () => q,
      eq: (c, v) => (filtros.push((r) => r[c] === v), q),
      in: (c, v) => (filtros.push((r) => v.includes(r[c])), q),
      range: () => q,
      upsert: (linhas, { onConflict }) => {
        for (const l of linhas) {
          const a = tabelas[nome].find((r) => r[onConflict] === l[onConflict]);
          if (a) Object.assign(a, l);
          else tabelas[nome].push({ id: `novo-${tabelas[nome].length}-${nome}`, ...l });
        }
        return q;
      },
      insert: (linhas) => (tabelas[nome].push(...linhas), q),
      delete: () => ((q.apagar = true), q),
      then: (resolver) => {
        const achadas = tabelas[nome].filter((r) => filtros.every((f) => f(r)));
        if (q.apagar) tabelas[nome] = tabelas[nome].filter((r) => !achadas.includes(r));
        resolver({ data: achadas, error: null });
      },
    };
    return q;
  };
  return { from: consulta, tabelas: () => tabelas };
}

describe('aplicarDetalhes', () => {
  const base = () => ({
    tarefas: [{ id: 't1', fonte: 'trello', id_externo: 'c1' }],
    trello_membros: [],
    tarefa_membros: [],
    trello_comentarios: [{ id: 'velho', tarefa_id: 't1', id_externo: 'sumiu', texto: 'x', data: '2026-01-01' }],
    trello_checklist_itens: [],
  });
  const detalhes = {
    membros: [{ id_externo: 'm1', nome: 'Um', usuario: 'um' }],
    vinculos: [{ cartao: 'c1', membro: 'm1' }, { cartao: 'fora', membro: 'm1' }],
    comentarios: [{ id_externo: 'a1', cartao: 'c1', autor: 'Um', texto: 'ok', data: '2026-11-01' }, { id_externo: 'a2', cartao: 'fora', autor: 'Um', texto: 'ignorado', data: '2026-11-01' }],
    itens: [{ id_externo: 'i1', cartao: 'c1', checklist: 'L', nome: 'Item', concluido: false, posicao: 1 }],
  };

  it('grava só o que pertence a cartões importados e tira o que sumiu do Trello', async () => {
    const db = bancoFalso(base());
    const r = await aplicarDetalhes(db, detalhes);
    const t = db.tabelas();
    expect(t.tarefa_membros).toHaveLength(1);
    expect(t.trello_comentarios.map((c) => c.id_externo)).toEqual(['a1']);
    expect(t.trello_checklist_itens[0].tarefa_id).toBe('t1');
    expect(r).toEqual({ membros: 1, comentarios: 1, itens: 1 });
  });

  it('rodar de novo não duplica', async () => {
    const db = bancoFalso(base());
    await aplicarDetalhes(db, detalhes);
    await aplicarDetalhes(db, detalhes);
    expect(db.tabelas().tarefa_membros).toHaveLength(1);
    expect(db.tabelas().trello_comentarios).toHaveLength(1);
  });

  it('membro retirado do cartão sai do vínculo', async () => {
    const db = bancoFalso(base());
    await aplicarDetalhes(db, detalhes);
    await aplicarDetalhes(db, { ...detalhes, vinculos: [] });
    expect(db.tabelas().tarefa_membros).toHaveLength(0);
  });
});

describe('criar cartão a partir de comentário', () => {
  const rotas = {
    '/cards/c1': { idBoard: 'q1', shortUrl: 'https://trello.com/c/abc' },
    '/boards/q1/lists': [{ id: 'l1', name: 'A fazer' }, { id: 'l2', name: 'Senhas apps' }],
    '/cards': { id: 'novo', shortUrl: 'https://trello.com/c/novo' },
  };

  it('oferece as listas do quadro, sem as sensíveis', async () => {
    apiFalsa(rotas);
    expect(await listasDoCartao(cred, 'c1')).toEqual([{ id: 'l1', nome: 'A fazer' }]);
  });

  it('cria com o texto do comentário e o link do cartão de origem', async () => {
    const c = apiFalsa(rotas);
    const r = await criarCartaoDeComentario(cred, { idCartaoOrigem: 'c1', idLista: 'l1', titulo: 'Novo', texto: 'Trocar a fôrma' });
    expect(r).toEqual({ id: 'novo', url: 'https://trello.com/c/novo' });
    const post = c.find((x) => x.metodo === 'POST');
    expect(post.corpo.get('idList')).toBe('l1');
    expect(post.corpo.get('name')).toBe('Novo');
    expect(post.corpo.get('desc')).toContain('Trocar a fôrma');
    expect(post.corpo.get('desc')).toContain('https://trello.com/c/abc');
  });

  it('recusa lista de outro quadro e não altera nem apaga nada no cartão de origem', async () => {
    const c = apiFalsa(rotas);
    await expect(criarCartaoDeComentario(cred, { idCartaoOrigem: 'c1', idLista: 'outra', titulo: 'X', texto: 'Y' })).rejects.toThrow(/lista/i);
    expect(c.every((x) => x.metodo === 'GET')).toBe(true);
  });
});
