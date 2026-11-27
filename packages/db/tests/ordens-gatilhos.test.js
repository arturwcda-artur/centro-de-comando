// Controle de ordens e gatilhos (migration 0041, RN-49t e RN-49u).
import { describe, it, expect, beforeAll } from 'vitest';
import { criarBanco, como, PROPRIETARIO } from './helpers.js';

let db;
beforeAll(async () => {
  db = await criarBanco();
});
const sql = (q, p) => como(db, 'authenticated', PROPRIETARIO, (tx) => tx.query(q, p));

describe('ordens', () => {
  it('aceita só delegada ou comigo', async () => {
    const { rows } = await sql(`insert into public.tarefas (titulo, ordem_tipo, ordem_em) values ('ordem', 'comigo', now()) returning ordem_tipo`);
    expect(rows[0].ordem_tipo).toBe('comigo');
    await expect(sql(`insert into public.tarefas (titulo, ordem_tipo) values ('x', 'outra')`)).rejects.toThrow();
  });
});

describe('gatilhos', () => {
  it('vêm com os 9 valores sugeridos na Doutrina, todos ligados', async () => {
    const { rows } = await sql(`select chave, ativo, limite from public.gatilhos order by ordem`);
    expect(rows).toHaveLength(9);
    expect(rows.every((r) => r.ativo)).toBe(true);
    expect(rows.find((r) => r.chave === 'ordem_vencida').limite).toBe(3);
  });
  it('o gestor desliga e muda o limite; mudança fica na auditoria', async () => {
    await sql(`update public.gatilhos set ativo = false, limite = 10 where chave = 'diario_sem_registro'`);
    const { rows } = await db.query(`select count(*)::int n from app.auditoria where tabela = 'gatilhos' and operacao = 'UPDATE'`);
    expect(rows[0].n).toBe(1);
  });
});
