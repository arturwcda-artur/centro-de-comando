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

describe('importação única do plano de ações da planilha', () => {
  it('cada ação da planilha vira um problema com a sua ação, editável no sistema', async () => {
    const banco = await criarBanco();
    const obra = (await banco.query(`insert into public.obras (codigo, nome) values ('T-PROB', 'Teste') returning id`)).rows[0].id;
    await banco.query(`insert into public.acoes_planilhas (obra_id, caminho) values ($1, 'C:/x.xlsx')`, [obra]);
    const t1 = (await banco.query(`insert into public.tarefas (titulo, obra_id, fonte, id_externo, status) values ('[1] Cobrar sondagem', $1, 'planilha', 'a:1', 'a_fazer') returning id`, [obra])).rows[0].id;
    const t2 = (await banco.query(`insert into public.tarefas (titulo, obra_id, fonte, id_externo, status, concluida_em) values ('[2] Feita', $1, 'planilha', 'a:2', 'concluida', now()) returning id`, [obra])).rows[0].id;
    await banco.query(`insert into public.acoes_detalhes (tarefa_id, gravidade, urgencia, tendencia, o_que) values ($1, 5, 5, 3, 'Cobrar sondagem')`, [t1]);

    // Reaplica só a parte de importação da migration 0032
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { pastaMigrations } = await import('./helpers.js');
    const sql = readFileSync(join(pastaMigrations, '0032_problemas.sql'), 'utf8');
    await banco.exec(sql.slice(sql.indexOf('-- Cada linha da planilha')));

    const p = (await banco.query(`select p.titulo, p.gut, p.status, p.origem, t.fonte from public.problemas p join public.tarefas t on t.problema_id = p.id order by p.gut desc`)).rows;
    expect(p).toEqual([
      { titulo: 'Cobrar sondagem', gut: 75, status: 'aberto', origem: 'planilha', fonte: 'manual' },
      { titulo: 'Feita', gut: 27, status: 'resolvido', origem: 'planilha', fonte: 'manual' },
    ]);
    expect((await banco.query(`select count(*)::int n from public.acoes_planilhas`)).rows[0].n).toBe(0);
    expect(t2).toBeTruthy();
  }, 60000);
});
