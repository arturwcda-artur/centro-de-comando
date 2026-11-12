// Plano de ações lido da Central de Gestão (migration 0030). Dados de TESTE em banco descartável.
import { beforeAll, describe, expect, it } from 'vitest';
import { PROPRIETARIO, como, criarBanco } from './helpers.js';

const OBRA = '11111111-0000-4000-8000-000000000031';
const ARQUIVO = '55555555-0000-4000-8000-000000000031';

const acao = (numero, extra = {}) => ({
  numero, titulo: `[${numero}] Ação ${numero}`, descricao: 'Por quê: teste', tipo: 'acao', categoria: 'Plano de ações · F1 · Fulano',
  responsavel_chave: 'fulano', prazo: '2026-11-13', status: 'a_fazer', concluida_em: null,
  importancia: 5, impacto: 4, critica: true, depende: [], hash: `h${numero}`, ...extra,
});
const carga = (acoes, hash = 'arquivo-1') => ({ arquivo_id: ARQUIVO, hash, acoes });

let db;
const importar = (p) => como(db, 'agente_cronograma', null, (tx) => tx.query(`select public.importar_acoes($1::jsonb) as r`, [JSON.stringify(p)])).then((x) => x.rows[0].r);
const tarefa = async (n) => (await db.query(`select * from public.tarefas where fonte = 'planilha' and id_externo = $1`, [`${OBRA}:${n}`])).rows[0];

beforeAll(async () => {
  db = await criarBanco();
  await db.query(`insert into public.obras (id, codigo, nome) values ($1, 'TESTE-ACOES', 'Teste')`, [OBRA]);
  await db.query(`insert into public.acoes_planilhas (id, obra_id, caminho) values ($1, $2, 'C:\\acoes.xlsx')`, [ARQUIVO, OBRA]);
  await db.query(`insert into public.pessoas (nome) values ('Fulano de Tal (TESTE)'), ('Beltrano (TESTE)'), ('Beltrano Outro (TESTE)')`);
});

describe('importar_acoes', () => {
  it('cria a tarefa com origem planilha, ligada à obra e à pessoa pelo primeiro nome', async () => {
    expect(await importar(carga([acao(1), acao(2, { depende: ['1'] })]))).toBe('2 novas, 0 alteradas, 0 fora da planilha');
    const t = await tarefa(1);
    expect(t).toMatchObject({ obra_id: OBRA, fonte: 'planilha', status: 'a_fazer', critica: true, importancia: 5, impacto: 4, status_sync: 'sincronizado' });
    const p = await db.query(`select nome from public.pessoas where id = $1`, [t.responsavel_id]);
    expect(p.rows[0].nome).toBe('Fulano de Tal (TESTE)');
    const dep = await db.query(`select count(*)::int n from public.tarefa_dependencias where tarefa_id = $1`, [(await tarefa(2)).id]);
    expect(dep.rows[0].n).toBe(1);
  });

  it('não altera o que não mudou e atualiza o que mudou', async () => {
    expect(await importar(carga([acao(1), acao(2, { depende: ['1'] })], 'arquivo-2'))).toBe('0 novas, 0 alteradas, 0 fora da planilha');
    expect(await importar(carga([acao(1, { prazo: '2026-11-20', hash: 'h1b' }), acao(2, { depende: ['1'] })], 'arquivo-3'))).toBe('0 novas, 1 alteradas, 0 fora da planilha');
    expect((await tarefa(1)).prazo).toBeTruthy();
  });

  it('nome com mais de uma pessoa correspondente fica sem responsável', async () => {
    await importar(carga([acao(1), acao(2), acao(3, { responsavel_chave: 'beltrano' })], 'arquivo-4'));
    expect((await tarefa(3)).responsavel_id).toBeNull();
  });

  it('concluída recebe a data; aguardando terceiro sem pessoa vira em andamento', async () => {
    await importar(carga([acao(1, { status: 'concluida', concluida_em: '2026-11-12', hash: 'c1' }), acao(2, { status: 'aguardando_terceiro', responsavel_chave: 'ninguem', hash: 'c2' }), acao(3)], 'arquivo-5'));
    const t1 = await tarefa(1);
    expect(t1.status).toBe('concluida');
    expect(t1.concluida_em).not.toBeNull();
    expect((await tarefa(2)).status).toBe('em_andamento');
  });

  it('ação que saiu da planilha não é apagada: fica pendente de conferência e volta ao reaparecer', async () => {
    expect(await importar(carga([acao(1, { status: 'concluida', concluida_em: '2026-11-12', hash: 'c1' }), acao(2, { status: 'aguardando_terceiro', responsavel_chave: 'ninguem', hash: 'c2' })], 'arquivo-6'))).toBe('0 novas, 0 alteradas, 1 fora da planilha');
    expect((await tarefa(3)).status_sync).toBe('pendente');
    await importar(carga([acao(1, { status: 'concluida', concluida_em: '2026-11-12', hash: 'c1' }), acao(2, { status: 'aguardando_terceiro', responsavel_chave: 'ninguem', hash: 'c2' }), acao(3)], 'arquivo-7'));
    expect((await tarefa(3)).status_sync).toBe('sincronizado');
  });

  it('guarda notas GUT e 5W2H separados, e atualiza quando mudam', async () => {
    const w = { o_que: 'Ação 1', por_que: 'Motivo', onde: 'Bloco A', quem: 'Fulano', como: 'Assim', quanto: 'R$ 100' };
    const comDetalhe = (gut) => acao(1, { status: 'concluida', concluida_em: '2026-11-12', hash: `d${gut.urgencia}`, gut, w5h2: w });
    const lista = (gut) => [comDetalhe(gut), acao(2, { status: 'aguardando_terceiro', responsavel_chave: 'ninguem', hash: 'c2' }), acao(3)];
    await importar(carga(lista({ gravidade: 5, urgencia: 4, tendencia: 3 }), 'arquivo-8'));
    const id = (await tarefa(1)).id;
    const d = async () => (await db.query(`select * from public.acoes_detalhes where tarefa_id = $1`, [id])).rows[0];
    expect(await d()).toMatchObject({ gravidade: 5, urgencia: 4, tendencia: 3, gut: 60, por_que: 'Motivo', quanto: 'R$ 100' });
    await importar(carga(lista({ gravidade: 5, urgencia: 5, tendencia: 3 }), 'arquivo-9'));
    expect((await d()).gut).toBe(75);
    const semDetalhe = await db.query(`select count(*)::int n from public.acoes_detalhes d join public.tarefas t on t.id = d.tarefa_id where t.id_externo = $1 and d.gut is not null`, [`${OBRA}:3`]);
    expect(semDetalhe.rows[0].n).toBe(0);
  });

  it('usuário logado lê os detalhes', async () => {
    const n = await como(db, 'authenticated', PROPRIETARIO, async (tx) => (await tx.query(`select count(*)::int n from public.acoes_detalhes`)).rows[0].n);
    expect(n).toBeGreaterThan(0);
  });

  it('planilha não cadastrada é recusada', async () => {
    await expect(importar({ arquivo_id: '55555555-0000-4000-8000-000000000099', hash: 'x', acoes: [] })).rejects.toThrow(/não cadastrada/);
  });

  it('só o papel do agente executa as funções', async () => {
    await expect(como(db, 'authenticated', PROPRIETARIO, (tx) => tx.query(`select public.importar_acoes('{}'::jsonb)`))).rejects.toThrow(/permission denied/);
    await expect(como(db, 'authenticated', PROPRIETARIO, (tx) => tx.query(`select * from public.listar_acoes_agente()`))).rejects.toThrow(/permission denied/);
    const r = await como(db, 'agente_cronograma', null, (tx) => tx.query(`select * from public.listar_acoes_agente()`));
    expect(r.rows).toHaveLength(1);
  });

  it('o proprietário cadastra a planilha pela aplicação (RLS)', async () => {
    const r = await como(db, 'authenticated', PROPRIETARIO, (tx) => tx.query(`select count(*)::int n from public.acoes_planilhas`));
    expect(r.rows[0].n).toBe(1);
  });
});
