// Importação de cronogramas (migration 0019). Dados de TESTE em banco descartável.
import { beforeAll, describe, expect, it } from 'vitest';
import { PROPRIETARIO, como, criarBanco } from './helpers.js';

const OBRA = '11111111-0000-4000-8000-000000000001';
const VIGENTE = '22222222-0000-4000-8000-000000000001';
const BASE = '22222222-0000-4000-8000-000000000002';

const atividade = (uid, extra = {}) => ({ uid, nome: `Atividade ${uid}`, nivel: 2, resumo: false, marco: false, critica: false, percentual: 0, custo: 100, inicio_previsto: '2026-11-02', fim_previsto: '2026-11-06', ...extra });
const carga = (arquivo, hash, extra = {}) => ({ arquivo_id: arquivo, hash, nome: 'Plano', atividades: [atividade(1), atividade(2)], dependencias: [{ uid: 2, predecessora_uid: 1, tipo: 'TI', defasagem_dias: 0 }], ...extra });

let db;
const importar = (p) => como(db, 'agente_cronograma', null, (tx) => tx.query(`select public.importar_cronograma($1::jsonb) as r`, [JSON.stringify(p)])).then((x) => x.rows[0].r);
const tipos = async (arquivo) => (await db.query(`select tipo from public.cronograma_versoes where arquivo_id = $1 order by criado_em, id`, [arquivo])).rows.map((r) => r.tipo).sort();

beforeAll(async () => {
  db = await criarBanco();
  await db.query(`insert into public.obras (id, codigo, nome) values ($1, 'TESTE', 'Teste')`, [OBRA]);
  await db.query(`insert into public.cronograma_arquivos (id, obra_id, papel, caminho) values ($1, $3, 'vigente', 'C:\\a.mpp'), ($2, $3, 'linha_base', 'C:\\b.mpp')`, [VIGENTE, BASE, OBRA]);
});

describe('importar_cronograma', () => {
  it('cria a versão com atividades, custo e dependências', async () => {
    expect(await importar(carga(VIGENTE, 'h1'))).toBe('criada');
    const a = await db.query(`select count(*)::int n, sum(custo)::int c from public.atividades_cronograma a join public.cronograma_versoes v on v.id = a.versao_id where v.arquivo_id = $1`, [VIGENTE]);
    expect(a.rows[0]).toEqual({ n: 2, c: 200 });
    const d = await db.query(`select count(*)::int n from public.dependencias`);
    expect(d.rows[0].n).toBe(1);
    const arq = await db.query(`select ultimo_hash, ultima_leitura_em is not null lido from public.cronograma_arquivos where id = $1`, [VIGENTE]);
    expect(arq.rows[0]).toEqual({ ultimo_hash: 'h1', lido: true });
  });

  it('o mesmo arquivo não cria outra versão', async () => {
    expect(await importar(carga(VIGENTE, 'h1'))).toBe('igual');
    expect(await tipos(VIGENTE)).toEqual(['vigente']);
  });

  it('arquivo alterado vira o vigente e guarda o anterior como histórico', async () => {
    expect(await importar(carga(VIGENTE, 'h2'))).toBe('criada');
    expect(await tipos(VIGENTE)).toEqual(['historico', 'vigente']);
  });

  it('voltar ao conteúdo anterior reativa a versão, sem duplicar', async () => {
    expect(await importar(carga(VIGENTE, 'h1'))).toBe('igual');
    const r = await db.query(`select id_externo from public.cronograma_versoes where tipo = 'vigente' and arquivo_id = $1`, [VIGENTE]);
    expect(r.rows[0].id_externo).toContain('h1');
    expect((await tipos(VIGENTE)).length).toBe(2);
  });

  it('a linha de base nunca é trocada sozinha', async () => {
    await importar(carga(BASE, 'b1'));
    await importar(carga(BASE, 'b2'));
    expect(await tipos(BASE)).toEqual(['linha_base', 'reprogramacao']);
  });

  it('carga com erro não deixa nada pela metade', async () => {
    const ruim = carga(VIGENTE, 'h3', { atividades: [atividade(1), atividade(1)] });
    await expect(importar(ruim)).rejects.toThrow();
    const r = await db.query(`select count(*)::int n from public.cronograma_versoes where id_externo like '%h3'`);
    expect(r.rows[0].n).toBe(0);
  });

  it('marcos do vigente entram em marcos, e o limite contratual é identificado', async () => {
    const marcos = [atividade(1), atividade(2, { nome: 'Limite contratual (TR 6.2)', marco: true, custo: 0, fim_previsto: '2027-09-29' }), atividade(3, { nome: 'Término calculado', marco: true, custo: 0, fim_previsto: '2027-04-08' })];
    await importar(carga(VIGENTE, 'h4', { atividades: marcos, dependencias: [] }));
    await importar(carga(VIGENTE, 'h5', { atividades: marcos, dependencias: [] }));
    const r = await db.query(`select nome, contratual, data_contratual::text, data_prevista::text from public.marcos where obra_id = $1 order by nome`, [OBRA]);
    expect(r.rows).toEqual([
      { nome: 'Limite contratual (TR 6.2)', contratual: true, data_contratual: '2027-09-29', data_prevista: '2027-09-29' },
      { nome: 'Término calculado', contratual: false, data_contratual: null, data_prevista: '2027-04-08' },
    ]);
  });

  it('marcos da linha de base não alteram a tabela de marcos', async () => {
    await importar(carga(BASE, 'b3', { atividades: [atividade(9, { nome: 'Marco antigo', marco: true })], dependencias: [] }));
    const r = await db.query(`select count(*)::int n from public.marcos where nome = 'Marco antigo'`);
    expect(r.rows[0].n).toBe(0);
  });
});

describe('papel do agente', () => {
  it('lista os arquivos e registra erro de leitura', async () => {
    const r = await como(db, 'agente_cronograma', null, (tx) => tx.query(`select * from public.listar_cronogramas_agente()`));
    expect(r.rows.map((x) => x.caminho).sort()).toEqual(['C:\\a.mpp', 'C:\\b.mpp']);
    await como(db, 'agente_cronograma', null, (tx) => tx.query(`select public.registrar_erro_cronograma($1, 'Arquivo não encontrado')`, [BASE]));
    const e = await db.query(`select ultimo_erro from public.cronograma_arquivos where id = $1`, [BASE]);
    expect(e.rows[0].ultimo_erro).toBe('Arquivo não encontrado');
  });

  it('não lê nem grava nenhuma tabela diretamente', async () => {
    for (const sql of [`select * from public.obras`, `select * from public.cronograma_versoes`, `delete from public.marcos`]) {
      await expect(como(db, 'agente_cronograma', null, (tx) => tx.query(sql))).rejects.toThrow(/permission denied/);
    }
  });

  it('usuário logado e anônimo não usam as funções do agente', async () => {
    for (const papel of ['anon', 'authenticated']) {
      await expect(como(db, papel, PROPRIETARIO, (tx) => tx.query(`select * from public.listar_cronogramas_agente()`))).rejects.toThrow(/permission denied/);
    }
  });
});

describe('tornar_linha_base', () => {
  it('só o proprietário troca, e a anterior vira histórico', async () => {
    const r = await db.query(`select id from public.cronograma_versoes where tipo = 'reprogramacao' and arquivo_id = $1 limit 1`, [BASE]);
    const id = r.rows[0].id;
    const trocar = (tx) => tx.query(`select public.tornar_linha_base($1)`, [id]);
    await expect(como(db, 'authenticated', PROPRIETARIO, trocar, { aal: 'aal1' })).rejects.toThrow(/Sem permissão/);
    await como(db, 'authenticated', PROPRIETARIO, trocar);
    const t = await db.query(`select tipo from public.cronograma_versoes where id = $1`, [id]);
    expect(t.rows[0].tipo).toBe('linha_base');
    const n = await db.query(`select count(*)::int n from public.cronograma_versoes where obra_id = $1 and tipo = 'linha_base'`, [OBRA]);
    expect(n.rows[0].n).toBe(1);
  });
});

describe('cronograma_realizado', () => {
  it('soma custo vezes percentual, sem contar as linhas de resumo', async () => {
    const atividades = [atividade(1, { custo: 1000, percentual: 50 }), atividade(2, { custo: 1000, percentual: 0 }), atividade(3, { resumo: true, custo: 2000, percentual: 25 })];
    await importar(carga(VIGENTE, 'h6', { atividades, dependencias: [] }));
    const r = await como(db, 'authenticated', PROPRIETARIO, (tx) => tx.query(`select total::int, realizado::int from public.cronograma_realizado r join public.cronograma_versoes v on v.id = r.versao_id where v.tipo = 'vigente' and v.obra_id = $1`, [OBRA]));
    expect(r.rows[0]).toEqual({ total: 2000, realizado: 500 });
  });
});
