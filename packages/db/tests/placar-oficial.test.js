// Placar oficial da equipe (migration 0040, RN-49p).
import { describe, it, expect, beforeAll } from 'vitest';
import { criarBanco, como, PROPRIETARIO } from './helpers.js';

let db;
let tarefa;
beforeAll(async () => {
  db = await criarBanco();
  tarefa = await como(db, 'authenticated', PROPRIETARIO, async (tx) =>
    (await tx.query(`insert into public.tarefas (titulo, fonte, id_externo, categoria) values ('cartão', 'trello', 'c-placar', 'Obras do Grupo - C.SALLES › PRF') returning id`)).rows[0].id,
  );
});

const item = (sql, params) => como(db, 'authenticated', PROPRIETARIO, (tx) => tx.query(sql, params));
const primeira = async () => (await db.query(`select primeiro_concluido_em::text d from public.trello_checklist_itens where id_externo = 'i-1'`)).rows[0].d;

describe('primeira marcação do item', () => {
  it('guarda a primeira data e não muda quando o item é desmarcado e marcado de novo', async () => {
    await item(`insert into public.trello_checklist_itens (tarefa_id, id_externo, checklist, nome, concluido, posicao) values ($1, 'i-1', 'L', 'item', false, 1)`, [tarefa]);
    expect(await primeira()).toBeNull();

    await item(`update public.trello_checklist_itens set concluido = true, concluido_em = '2026-11-10T12:00:00Z' where id_externo = 'i-1'`);
    expect(await primeira()).toBe('2026-11-10 12:00:00+00');

    await item(`update public.trello_checklist_itens set concluido = false, concluido_em = null where id_externo = 'i-1'`);
    await item(`update public.trello_checklist_itens set concluido = true, concluido_em = '2026-11-28T12:00:00Z' where id_externo = 'i-1'`);
    expect(await primeira()).toBe('2026-11-10 12:00:00+00');
  });
});

describe('placar fechado', () => {
  it('grava uma vez por quadro, tipo e início, e não aceita alteração', async () => {
    const inserir = `insert into public.equipe_placares (quadro, tipo, inicio, fim, dados) values ('Q', 'mes', '2026-11-01', '2026-12-01', '{"total": 1}')`;
    await item(inserir);
    await expect(item(inserir)).rejects.toThrow();
    await expect(item(`update public.equipe_placares set dados = '{"total": 2}'`)).rejects.toThrow(/não muda/);
    const { rows } = await db.query(`select dados->>'total' t from public.equipe_placares`);
    expect(rows).toEqual([{ t: '1' }]);
  });
});
