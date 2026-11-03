// Importação assistida de obras (migration 0013). Fixtures de teste em banco descartável.
import { describe, it, expect, beforeAll } from 'vitest';
import { criarBanco, como, PROPRIETARIO, INTRUSO } from './helpers.js';

let db;
beforeAll(async () => {
  db = await criarBanco();
});

async function proposta(tx, idExterno, extra = {}) {
  const { rows } = await tx.query(
    `insert into public.importacao_obras (id_externo, pasta_local, nome_sugerido, codigo_sugerido, situacao_sugerida, qtd_arquivos)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (fonte, id_externo) do update set qtd_arquivos = excluded.qtd_arquivos
     returning id`,
    [idExterno, `C:\\TESTE\\${idExterno}`, extra.nome ?? 'PASTA DE TESTE', extra.codigo ?? idExterno, extra.situacao ?? 'andamento', extra.qtd ?? 1],
  );
  return rows[0].id;
}

const aprovar = (tx, id, codigo) =>
  tx.query(`select public.aprovar_importacao_obra($1, $2, 'OBRA DE TESTE', 'andamento', null, null, 'Brasília', 'df') as obra_id`, [id, codigo]);

describe('importação assistida de obras', () => {
  it('reler a mesma pasta atualiza a proposta em vez de duplicar', async () => {
    await como(db, 'authenticated', PROPRIETARIO, async (tx) => {
      await proposta(tx, '2.1/PASTA-A', { qtd: 10 });
      await proposta(tx, '2.1/PASTA-A', { qtd: 12 });
    });
    const { rows } = await db.query(`select qtd_arquivos from public.importacao_obras where id_externo = '2.1/PASTA-A'`);
    expect(rows).toEqual([{ qtd_arquivos: 12 }]);
  });

  it('aprovar cria a obra, copia a pasta e marca a proposta, tudo junto', async () => {
    const id = await como(db, 'authenticated', PROPRIETARIO, (tx) => proposta(tx, '2.1/PASTA-B'));
    const r = await como(db, 'authenticated', PROPRIETARIO, (tx) => aprovar(tx, id, 'T-IMP-B'));
    const obraId = r.rows[0].obra_id;

    const { rows } = await db.query(
      `select o.codigo, o.uf, o.pasta_local, p.status, p.revisado_em is not null as revisado
       from public.importacao_obras p join public.obras o on o.id = p.obra_id where p.id = $1`,
      [id],
    );
    expect(rows[0]).toMatchObject({ codigo: 'T-IMP-B', uf: 'DF', pasta_local: 'C:\\TESTE\\2.1/PASTA-B', status: 'aprovada', revisado: true });
    expect(obraId).toBeTruthy();
  });

  it('a mesma proposta não pode ser aprovada duas vezes', async () => {
    const id = await como(db, 'authenticated', PROPRIETARIO, (tx) => proposta(tx, '2.1/PASTA-C'));
    await como(db, 'authenticated', PROPRIETARIO, (tx) => aprovar(tx, id, 'T-IMP-C'));
    await expect(como(db, 'authenticated', PROPRIETARIO, (tx) => aprovar(tx, id, 'T-IMP-C2'))).rejects.toThrow(/já revisada/);
  });

  it('código de obra repetido desfaz a aprovação inteira (proposta continua pendente)', async () => {
    const id = await como(db, 'authenticated', PROPRIETARIO, (tx) => proposta(tx, '2.1/PASTA-D'));
    await expect(como(db, 'authenticated', PROPRIETARIO, (tx) => aprovar(tx, id, 'T-IMP-B'))).rejects.toThrow(/unique/);
    const { rows } = await db.query(`select status, obra_id from public.importacao_obras where id = $1`, [id]);
    expect(rows[0]).toEqual({ status: 'pendente', obra_id: null });
  });

  it('descartar exige data de revisão e não cria obra', async () => {
    const id = await como(db, 'authenticated', PROPRIETARIO, (tx) => proposta(tx, '2.1/PEDIDOS'));
    await expect(
      como(db, 'authenticated', PROPRIETARIO, (tx) => tx.query(`update public.importacao_obras set status = 'descartada' where id = $1`, [id])),
    ).rejects.toThrow(/check constraint/);
    await como(db, 'authenticated', PROPRIETARIO, (tx) =>
      tx.query(`update public.importacao_obras set status = 'descartada', revisado_em = now() where id = $1`, [id]),
    );
    const { rows } = await db.query(`select status, obra_id from public.importacao_obras where id = $1`, [id]);
    expect(rows[0]).toEqual({ status: 'descartada', obra_id: null });
  });

  it('outro usuário não vê propostas nem consegue aprovar', async () => {
    const vistas = await como(db, 'authenticated', INTRUSO, (tx) => tx.query('select * from public.importacao_obras'));
    expect(vistas.rows).toHaveLength(0);
    const { rows } = await db.query(`select id from public.importacao_obras where status = 'pendente' limit 1`);
    await expect(como(db, 'authenticated', INTRUSO, (tx) => aprovar(tx, rows[0].id, 'T-INTRUSO'))).rejects.toThrow(/já revisada/);
  });

  it('anônimo não pode chamar a função de aprovação', async () => {
    await expect(
      como(db, 'anon', null, (tx) => tx.query(`select public.aprovar_importacao_obra(gen_random_uuid(), 'x', 'x', 'andamento')`)),
    ).rejects.toThrow(/permission denied/);
  });
});
