// Índice de documentos (migration 0023). Dados de TESTE em banco descartável.
import { beforeAll, describe, expect, it } from 'vitest';
import { PROPRIETARIO, como, criarBanco } from './helpers.js';

const OBRA = '11111111-0000-4000-8000-000000000001';
const PASTA = '55555555-0000-4000-8000-000000000001';

const doc = (relativo, extra = {}) => ({
  relativo, titulo: relativo.split('/').at(-1), categoria: 'medicoes', pasta: '05_Medicoes', data_documento: '2026-05-06',
  mime_type: 'application/pdf', tamanho_bytes: 10, texto_extraido: 'Concretagem da laje do bloco técnico', obsoleto: false, sem_texto: false,
  modificado_em: '2026-05-06T12:00:00Z', assinatura: 'a1', ...extra,
});

let db;
const agente = (sql, params) => como(db, 'agente_cronograma', null, (tx) => tx.query(sql, params));
const importar = (documentos) => agente(`select public.importar_documentos($1::jsonb) as n`, [JSON.stringify({ pasta_id: PASTA, documentos })]);
const buscar = (termo, extra = {}) =>
  como(db, 'authenticated', PROPRIETARIO, (tx) => tx.query(`select * from public.buscar_documentos($1, $2, $3, $4)`, [termo, extra.obra ?? null, extra.categoria ?? null, extra.obsoletos ?? false])).then((r) => r.rows);

beforeAll(async () => {
  db = await criarBanco();
  await db.query(`insert into public.obras (id, codigo, nome) values ($1, 'TESTE', 'Teste')`, [OBRA]);
  await db.query(`insert into public.documento_pastas (id, obra_id, caminho) values ($1, $2, 'C:\\obra')`, [PASTA, OBRA]);
});

describe('importar_documentos', () => {
  it('grava com caminho completo e não duplica ao reimportar', async () => {
    await importar([doc('05_Medicoes/a.pdf')]);
    await importar([doc('05_Medicoes/a.pdf', { assinatura: 'a2' })]);
    const r = await db.query(`select caminho_local, hash_conteudo from public.documentos`);
    expect(r.rows).toEqual([{ caminho_local: 'C:\\obra\\05_Medicoes\\a.pdf', hash_conteudo: 'a2' }]);
  });

  it('o agente recebe o caminho relativo e a assinatura', async () => {
    const r = await agente(`select * from public.listar_documentos_agente($1)`, [PASTA]);
    expect(r.rows).toEqual([{ relativo: '05_Medicoes/a.pdf', assinatura: 'a2' }]);
  });

  it('pasta não cadastrada é recusada', async () => {
    await expect(agente(`select public.importar_documentos($1::jsonb)`, [JSON.stringify({ pasta_id: OBRA, documentos: [] })])).rejects.toThrow(/não cadastrada/);
  });
});

describe('arquivos que somem', () => {
  it('saem da busca sem apagar o registro, e voltam se reaparecerem', async () => {
    await importar([doc('05_Medicoes/b.pdf')]);
    const r = await agente(`select public.encerrar_leitura_documentos($1, $2) as n`, [PASTA, ['05_Medicoes/a.pdf']]);
    expect(r.rows[0].n).toBe(1);
    expect((await buscar('')).map((d) => d.titulo)).toEqual(['a.pdf']);
    expect((await db.query(`select count(*)::int n from public.documentos`)).rows[0].n).toBe(2);
    await importar([doc('05_Medicoes/b.pdf')]);
    expect((await buscar('')).length).toBe(2);
  });

  it('registra a leitura na pasta', async () => {
    const r = await db.query(`select ultima_leitura_em is not null lido from public.documento_pastas where id = $1`, [PASTA]);
    expect(r.rows[0].lido).toBe(true);
  });
});

describe('buscar_documentos', () => {
  it('acha termo de dentro do texto, com o trecho marcado', async () => {
    const r = await buscar('laje');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].trecho).toContain('«laje»');
  });

  it('filtra por categoria e esconde obsoletos por padrão', async () => {
    await importar([doc('08/velho.pdf', { categoria: 'projetos_tecnicos', obsoleto: true, texto_extraido: 'fundação antiga' })]);
    expect(await buscar('fundação')).toHaveLength(0);
    expect(await buscar('fundação', { obsoletos: true })).toHaveLength(1);
    expect(await buscar('', { categoria: 'projetos_tecnicos', obsoletos: true })).toHaveLength(1);
  });

  it('traz o link do Drive quando existe', async () => {
    const id = (await db.query(`select id from public.documentos where titulo = 'a.pdf'`)).rows[0].id;
    await db.query(`insert into public.documento_links (documento_id, drive_file_id, url) values ($1, 'x', 'https://drive/x')`, [id]);
    expect((await buscar('')).find((d) => d.titulo === 'a.pdf').url).toBe('https://drive/x');
  });

  it('sem segundo fator, não vê nada', async () => {
    const r = await como(db, 'authenticated', PROPRIETARIO, (tx) => tx.query(`select * from public.buscar_documentos()`), { aal: 'aal1' });
    expect(r.rows).toHaveLength(0);
  });
});

describe('papéis', () => {
  it('o agente não lê tabelas diretamente', async () => {
    await expect(agente(`select * from public.documentos`)).rejects.toThrow(/permission denied/);
  });

  it('usuário logado e anônimo não usam as funções do agente', async () => {
    for (const papel of ['anon', 'authenticated']) {
      await expect(como(db, papel, PROPRIETARIO, (tx) => tx.query(`select * from public.listar_pastas_agente()`))).rejects.toThrow(/permission denied/);
    }
  });

  it('tamanho do banco é só do proprietário com segundo fator', async () => {
    const ler = (tx) => tx.query(`select public.tamanho_do_banco() as b`);
    expect(Number((await como(db, 'authenticated', PROPRIETARIO, ler)).rows[0].b)).toBeGreaterThan(0);
    await expect(como(db, 'authenticated', PROPRIETARIO, ler, { aal: 'aal1' })).rejects.toThrow(/Sem permissão/);
  });
});
