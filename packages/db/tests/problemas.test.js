// Problemas no sistema (migration 0032). Banco descartável, dados de teste.
import { beforeAll, describe, expect, it } from 'vitest';
import { PROPRIETARIO, como, criarBanco } from './helpers.js';

let db;
beforeAll(async () => {
  db = await criarBanco();
});

describe('problemas', () => {
  it('calcula o GUT e prioriza', async () => {
    await db.query(`insert into public.problemas (titulo, gravidade, urgencia, tendencia) values ('Grave', 5, 5, 4), ('Leve', 1, 2, 1)`);
    const r = await db.query(`select titulo, gut from public.problemas order by gut desc`);
    expect(r.rows).toEqual([{ titulo: 'Grave', gut: 100 }, { titulo: 'Leve', gut: 2 }]);
  });

  it('nota fora de 1 a 5 é recusada', async () => {
    await expect(db.query(`insert into public.problemas (titulo, gravidade) values ('x', 6)`)).rejects.toThrow(/check/);
  });

  it('resolvido exige a data, e o contrário também', async () => {
    await expect(db.query(`insert into public.problemas (titulo, status) values ('x', 'resolvido')`)).rejects.toThrow(/check/);
    await expect(db.query(`insert into public.problemas (titulo, resolvido_em) values ('x', now())`)).rejects.toThrow(/check/);
  });

  it('ação 5W2H se liga ao problema e solta se ele for apagado', async () => {
    const p = (await db.query(`insert into public.problemas (titulo) values ('Com ação') returning id`)).rows[0].id;
    const t = (await db.query(`insert into public.tarefas (titulo, problema_id) values ('Fazer', $1) returning id`, [p])).rows[0].id;
    await db.query(`delete from public.problemas where id = $1`, [p]);
    expect((await db.query(`select problema_id from public.tarefas where id = $1`, [t])).rows[0].problema_id).toBeNull();
  });

  it('só o proprietário com segundo fator acessa', async () => {
    const n = await como(db, 'authenticated', PROPRIETARIO, async (tx) => (await tx.query(`select count(*)::int n from public.problemas`)).rows[0].n);
    expect(n).toBeGreaterThan(0);
    const sem = await como(db, 'authenticated', PROPRIETARIO, async (tx) => (await tx.query(`select count(*)::int n from public.problemas`)).rows[0].n, { aal: 'aal1' });
    expect(sem).toBe(0);
  });
});
