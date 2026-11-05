import { afterEach, describe, expect, it, vi } from 'vitest';
import { arvoreDaPasta, melhorArvore, vincularDocumentos } from '../src/google-drive.js';

// Respostas de TESTE no formato da API. Nenhuma chamada real é feita.
const PASTA = 'application/vnd.google-apps.folder';
const pasta = (id, name, pai) => ({ id, name, mimeType: PASTA, parents: [pai] });
const arquivo = (id, name, pai) => ({ id, name, mimeType: 'application/pdf', parents: [pai], webViewLink: `https://drive/${id}` });

function driveFalso(todos, raizes = {}) {
  const consultas = [];
  vi.stubGlobal('fetch', async (url) => {
    const u = new URL(String(url));
    const q = u.searchParams.get('q');
    consultas.push({ q, metodo: 'GET', pagina: u.searchParams.get('pageToken') });
    const nome = q.match(/^name = '(.*)' and mimeType/)?.[1];
    if (nome) return new Response(JSON.stringify({ files: (raizes[nome] ?? []).map((id) => ({ id })) }));
    const pais = [...q.matchAll(/'([^']+)' in parents/g)].map((m) => m[1]);
    return new Response(JSON.stringify({ files: todos.filter((f) => f.parents.some((p) => pais.includes(p))) }));
  });
  return consultas;
}
afterEach(() => vi.unstubAllGlobals());

describe('arvoreDaPasta', () => {
  it('monta o caminho relativo, com subpastas', async () => {
    driveFalso([pasta('p1', '05_Medicoes', 'raiz'), arquivo('a', '1º_Medição.pdf', 'p1'), arquivo('b', 'solto.pdf', 'raiz')]);
    const m = await arvoreDaPasta('t', 'raiz');
    expect([...m.keys()].sort()).toEqual(['05_Medicoes/1º_Medição.pdf', 'solto.pdf']);
    expect(m.get('solto.pdf')).toEqual({ id: 'b', url: 'https://drive/b' });
  });

  it('compara nomes com acento mesmo em formas Unicode diferentes', async () => {
    driveFalso([arquivo('a', 'Medic\u0327a\u0303o.pdf', 'raiz')]);
    const m = await arvoreDaPasta('t', 'raiz');
    expect(m.has('Medição.pdf')).toBe(true);
  });

  it('pergunta por várias pastas de uma vez', async () => {
    const subpastas = Array.from({ length: 25 }, (_, i) => pasta(`p${i}`, `s${i}`, 'raiz'));
    const c = driveFalso(subpastas);
    await arvoreDaPasta('t', 'raiz');
    expect(c).toHaveLength(3); // raiz + dois grupos de subpastas
  });

  it('segue as páginas da resposta', async () => {
    let n = 0;
    vi.stubGlobal('fetch', async () => {
      n += 1;
      return new Response(JSON.stringify(n === 1 ? { files: [arquivo('a', 'a.pdf', 'raiz')], nextPageToken: 'p2' } : { files: [arquivo('b', 'b.pdf', 'raiz')] }));
    });
    expect((await arvoreDaPasta('t', 'raiz')).size).toBe(2);
  });
});

describe('melhorArvore', () => {
  it('escolhe a pasta com mais caminhos do índice', async () => {
    driveFalso([arquivo('x', 'outro.pdf', 'r1'), arquivo('a', 'a.pdf', 'r2'), arquivo('b', 'b.pdf', 'r2')], { 'PRF-RECANTO': ['r1', 'r2'] });
    const m = await melhorArvore('t', 'PRF-RECANTO', ['a.pdf', 'b.pdf']);
    expect(m.has('a.pdf')).toBe(true);
    expect(m.has('outro.pdf')).toBe(false);
  });

  it('sem pasta no Drive, devolve vazio', async () => {
    driveFalso([]);
    expect((await melhorArvore('t', 'X', ['a.pdf'])).size).toBe(0);
  });
});

function bancoFalso(tabelas) {
  return {
    tabelas,
    from(nome) {
      const q = {
        select: () => q,
        eq: () => q,
        is: () => q,
        like: () => q,
        range: () => Promise.resolve({ data: tabelas[nome], error: null }),
        upsert: (linhas) => {
          tabelas[nome].push(...linhas);
          return Promise.resolve({ error: null });
        },
        then: (r) => r({ data: tabelas[nome], error: null }),
      };
      return q;
    },
  };
}

describe('vincularDocumentos', () => {
  const tabelas = () => ({
    documento_pastas: [{ id: 'p', caminho: 'C:\\obras\\PRF-RECANTO' }],
    documentos: [{ id: 'd1', id_externo: 'p:a.pdf' }, { id: 'd2', id_externo: 'p:sumiu.pdf' }],
    documento_links: [],
  });

  it('grava o link e conta o que ficou sem', async () => {
    driveFalso([arquivo('a', 'a.pdf', 'r')], { 'PRF-RECANTO': ['r'] });
    const db = bancoFalso(tabelas());
    const r = await vincularDocumentos(db, 't');
    expect(db.tabelas.documento_links).toEqual([{ documento_id: 'd1', drive_file_id: 'a', url: 'https://drive/a' }]);
    expect(r).toMatchObject({ lidos: 2, criados: 1, semLink: 1 });
  });

  it('link igual não é regravado', async () => {
    driveFalso([arquivo('a', 'a.pdf', 'r')], { 'PRF-RECANTO': ['r'] });
    const t = tabelas();
    t.documento_links = [{ documento_id: 'd1', drive_file_id: 'a', url: 'https://drive/a' }];
    const db = bancoFalso(t);
    const r = await vincularDocumentos(db, 't');
    expect(db.tabelas.documento_links).toHaveLength(1);
    expect(r).toMatchObject({ criados: 0, ignorados: 1 });
  });

  it('só faz leituras no Drive', async () => {
    const c = driveFalso([arquivo('a', 'a.pdf', 'r')], { 'PRF-RECANTO': ['r'] });
    await vincularDocumentos(bancoFalso(tabelas()), 't');
    expect(c.every((x) => x.metodo === 'GET')).toBe(true);
  });
});
