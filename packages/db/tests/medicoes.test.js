// Medições item por item (migration 0020). Dados de TESTE em banco descartável.
import { beforeAll, describe, expect, it } from 'vitest';
import { PROPRIETARIO, como, criarBanco } from './helpers.js';

const OBRA = '11111111-0000-4000-8000-000000000001';
const CONTRATO = '33333333-0000-4000-8000-000000000001';
const ARQUIVO = '44444444-0000-4000-8000-000000000001';

const itens = [
  { item: '1', descricao: 'Tapume', unidade: 'm²', quantidade: 100, preco_unitario: 10, valor_total: 1000 },
  { item: '2', descricao: 'Estaca', unidade: 'm', quantidade: 10, preco_unitario: 50, valor_total: 500 },
];
const medicao = (numero, valor, extra = {}) => ({
  numero, data: '2026-05-06', periodo_inicio: '2026-04-06', periodo_fim: '2026-04-15', valor_bruto: valor, hash: `m${numero}-${valor}`,
  itens: [{ item: '1', quantidade: valor / 10, valor }], ...extra,
});
const carga = (medicoes, hash = 'h1', extra = {}) => ({ arquivo_id: ARQUIVO, hash, itens, medicoes, ...extra });

let db;
const importar = (p) => como(db, 'agente_cronograma', null, (tx) => tx.query(`select public.importar_medicoes($1::jsonb) as r`, [JSON.stringify(p)])).then((x) => x.rows[0].r);
const medicaoNo = async (n) => (await db.query(`select * from public.medicoes where contrato_id = $1 and numero = $2`, [CONTRATO, n])).rows[0];
const saldo = async (item) => (await db.query(`select quantidade_medida::float q, valor_saldo::float s, acima_do_contrato a from public.v_contrato_itens_saldo where contrato_id = $1 and item = $2`, [CONTRATO, item])).rows[0];

beforeAll(async () => {
  db = await criarBanco();
  await db.query(`insert into public.obras (id, codigo, nome) values ($1, 'TESTE', 'Teste')`, [OBRA]);
  await db.query(`insert into public.contratos (id, obra_id, numero, valor_original) values ($1, $2, '1/2026', 1500)`, [CONTRATO, OBRA]);
  await db.query(`insert into public.medicao_arquivos (id, contrato_id, caminho) values ($1, $2, 'C:\\m.xlsx')`, [ARQUIVO, CONTRATO]);
});

describe('importar_medicoes', () => {
  it('cria itens e medição como elaborada, sem contar no valor medido do contrato', async () => {
    await importar(carga([medicao(1, 200)]));
    const m = await medicaoNo(1);
    expect(m).toMatchObject({ situacao: 'elaborada', fonte: 'planilha' });
    expect(Number(m.valor_medido)).toBe(200);
    expect(await saldo('1')).toEqual({ q: 20, s: 800, a: false });
    const r = await db.query(`select valor_medido::float v from public.v_contratos_resumo where contrato_id = $1`, [CONTRATO]);
    expect(r.rows[0].v).toBe(0);
  });

  it('reimportar o mesmo conteúdo não duplica nem regrava', async () => {
    const antes = await medicaoNo(1);
    await importar(carga([medicao(1, 200)], 'h1'));
    const depois = await medicaoNo(1);
    expect(depois.atualizado_em).toEqual(antes.atualizado_em);
    const n = await db.query(`select count(*)::int n from public.medicao_itens`);
    expect(n.rows[0].n).toBe(1);
  });

  it('medição elaborada acompanha a planilha', async () => {
    await importar(carga([medicao(1, 300)], 'h2'));
    expect(Number((await medicaoNo(1)).valor_medido)).toBe(300);
    expect((await saldo('1')).q).toBe(30);
  });

  it('medição aprovada não é sobrescrita, e a diferença fica registrada', async () => {
    await db.query(`update public.medicoes set situacao = 'aprovada', data_aprovacao = '2026-05-20' where contrato_id = $1 and numero = 1`, [CONTRATO]);
    await importar(carga([medicao(1, 350)], 'h3'));
    const m = await medicaoNo(1);
    expect(Number(m.valor_medido)).toBe(300);
    expect(Number(m.diferenca_planilha)).toBe(50);
    expect(m.situacao).toBe('aprovada');
    expect((await saldo('1')).q).toBe(30);
  });

  it('quando a planilha volta ao valor aprovado, a diferença é limpa', async () => {
    await importar(carga([medicao(1, 300)], 'h4'));
    expect((await medicaoNo(1)).diferenca_planilha).toBeNull();
  });

  it('medição aprovada entra no valor medido do contrato, descontada a glosa', async () => {
    await db.query(`update public.medicoes set valor_glosado = 100 where contrato_id = $1 and numero = 1`, [CONTRATO]);
    const r = await db.query(`select valor_medido::float v from public.v_contratos_resumo where contrato_id = $1`, [CONTRATO]);
    expect(r.rows[0].v).toBe(200);
  });

  it('item que some da planilha não é apagado', async () => {
    await importar(carga([medicao(1, 300)], 'h5', { itens: [itens[0]] }));
    const n = await db.query(`select count(*)::int n from public.contrato_itens where contrato_id = $1`, [CONTRATO]);
    expect(n.rows[0].n).toBe(2);
  });

  it('medição acima do contrato é sinalizada no serviço', async () => {
    await importar(carga([medicao(1, 300), medicao(2, 500, { itens: [{ item: '2', quantidade: 12, valor: 600 }] })], 'h6'));
    expect(await saldo('2')).toEqual({ q: 12, s: -100, a: true });
  });

  it('medição cancelada sai do saldo e não volta pela planilha', async () => {
    await db.query(`update public.medicoes set situacao = 'cancelada' where contrato_id = $1 and numero = 2`, [CONTRATO]);
    expect((await saldo('2')).q).toBe(0);
    await importar(carga([medicao(2, 999)], 'h7'));
    const m = await medicaoNo(2);
    expect(m.situacao).toBe('cancelada');
    expect(Number(m.valor_medido)).toBe(500);
  });

  it('carga com erro não deixa nada pela metade', async () => {
    const ruim = carga([medicao(3, 100), { ...medicao(4, 100), periodo_inicio: 'data ruim' }], 'h8');
    await expect(importar(ruim)).rejects.toThrow();
    expect(await medicaoNo(3)).toBeUndefined();
    const a = await db.query(`select ultimo_hash from public.medicao_arquivos where id = $1`, [ARQUIVO]);
    expect(a.rows[0].ultimo_hash).toBe('h7');
  });
});

describe('papel do agente', () => {
  it('lista os arquivos e registra erro', async () => {
    const r = await como(db, 'agente_cronograma', null, (tx) => tx.query(`select * from public.listar_medicoes_agente()`));
    expect(r.rows[0]).toMatchObject({ caminho: 'C:\\m.xlsx', modelo: 'mascara_medicoes' });
    await como(db, 'agente_cronograma', null, (tx) => tx.query(`select public.registrar_erro_medicao($1, 'Modelo inválido')`, [ARQUIVO]));
    const e = await db.query(`select ultimo_erro from public.medicao_arquivos where id = $1`, [ARQUIVO]);
    expect(e.rows[0].ultimo_erro).toBe('Modelo inválido');
  });

  it('não acessa tabelas diretamente', async () => {
    for (const sql of [`select * from public.contratos`, `select * from public.medicoes`, `delete from public.contrato_itens`]) {
      await expect(como(db, 'agente_cronograma', null, (tx) => tx.query(sql))).rejects.toThrow(/permission denied/);
    }
  });

  it('usuário logado e anônimo não usam as funções do agente', async () => {
    for (const papel of ['anon', 'authenticated']) {
      await expect(como(db, papel, PROPRIETARIO, (tx) => tx.query(`select * from public.listar_medicoes_agente()`))).rejects.toThrow(/permission denied/);
    }
  });

  it('o proprietário lê o saldo, e sem segundo fator não', async () => {
    const ler = (tx) => tx.query(`select * from public.v_contrato_itens_saldo`);
    expect((await como(db, 'authenticated', PROPRIETARIO, ler)).rows.length).toBe(2);
    expect((await como(db, 'authenticated', PROPRIETARIO, ler, { aal: 'aal1' })).rows.length).toBe(0);
  });
});
