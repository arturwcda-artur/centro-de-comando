// Visão de tarefas priorizadas (migrations 0010 e 0014). Fixtures de teste em banco descartável.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { criarBanco, como, pastaMigrations, PROPRIETARIO } from './helpers.js';

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

describe('migration 0016 (remoção de cópias sensíveis)', () => {
  it('remove a cópia e o rastro na auditoria, preserva o resto e registra a remoção sem conteúdo', async () => {
    const inserir = `insert into public.tarefas (titulo, descricao, fonte, id_externo, categoria) values ($1, $2, 'trello', $3, $4) returning id`;
    const { sensivel, comum } = await como(db, 'authenticated', PROPRIETARIO, async (tx) => ({
      sensivel: (await tx.query(inserir, ['app de teste', 'CONTEUDO-SENSIVEL-TESTE', 'c-s', 'tarefas › Senhas apps'])).rows[0].id,
      comum: (await tx.query(inserir, ['cartão comum', 'texto', 'c-c', 'Obras › PRF'])).rows[0].id,
    }));

    await db.exec(readFileSync(join(pastaMigrations, '0016_remover_listas_sensiveis.sql'), 'utf8'));

    const tarefas = await db.query(`select id from public.tarefas where id = any($1)`, [[sensivel, comum]]);
    expect(tarefas.rows.map((r) => r.id)).toEqual([comum]);

    const rastro = await db.query(`select count(*)::int n from app.auditoria where registro_id = $1 or depois::text like '%CONTEUDO-SENSIVEL-TESTE%' or antes::text like '%CONTEUDO-SENSIVEL-TESTE%'`, [sensivel]);
    expect(rastro.rows[0].n).toBe(0);

    const preservado = await db.query(`select count(*)::int n from app.auditoria where registro_id = $1`, [comum]);
    expect(preservado.rows[0].n).toBe(1);

    const marca = await db.query(`select depois->>'quantidade' q from app.auditoria where depois->>'motivo' like 'Remoção de cópias%'`);
    expect(marca.rows).toEqual([{ q: '1' }]);

    await db.query(`delete from public.tarefas where id = $1`, [comum]); // não interfere nos testes seguintes
  });

  it('deixa religados os triggers de auditoria e de imutabilidade', async () => {
    const { rows } = await db.query(`
      select t.tgname, t.tgenabled from pg_trigger t
      where t.tgname in ('tg_auditoria_imutavel') or (t.tgname = 'tg_auditoria' and t.tgrelid = 'public.tarefas'::regclass)`);
    expect(rows).toHaveLength(2);
    for (const r of rows) expect(r.tgenabled).toBe('O');
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
