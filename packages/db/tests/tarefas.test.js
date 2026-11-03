// Visão de tarefas priorizadas (migrations 0010 e 0014). Fixtures de teste em banco descartável.
import { describe, it, expect, beforeAll } from 'vitest';
import { criarBanco, como, PROPRIETARIO } from './helpers.js';

let db;
beforeAll(async () => {
  db = await criarBanco();
  await como(db, 'authenticated', PROPRIETARIO, async (tx) => {
    const eu = await tx.query(`insert into public.pessoas (nome, eh_usuario) values ('EU (TESTE)', true) returning id`);
    const outro = await tx.query(`insert into public.pessoas (nome) values ('TERCEIRO (TESTE)') returning id`);
    await tx.query(
      `insert into public.tarefas (titulo, responsavel_id) values ('sem responsável', null), ('minha', $1), ('do terceiro', $2)`,
      [eu.rows[0].id, outro.rows[0].id],
    );
  });
});

describe('minhas atribuições (RN-45)', () => {
  it('inclui as do usuário e as sem responsável; exclui as de terceiros', async () => {
    const { rows } = await db.query(`select titulo, minha from public.v_tarefas_priorizadas order by titulo`);
    expect(rows).toEqual([
      { titulo: 'do terceiro', minha: false },
      { titulo: 'minha', minha: true },
      { titulo: 'sem responsável', minha: true },
    ]);
  });

  it('tarefa concluída sai da visão priorizada', async () => {
    await como(db, 'authenticated', PROPRIETARIO, (tx) =>
      tx.query(`update public.tarefas set status = 'concluida', concluida_em = now() where titulo = 'minha'`),
    );
    const { rows } = await db.query(`select titulo from public.v_tarefas_priorizadas where titulo = 'minha'`);
    expect(rows).toHaveLength(0);
  });
});
