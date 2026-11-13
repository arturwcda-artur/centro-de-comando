// Membros do Trello viram pessoas (migration 0034). Banco descartável, nomes de teste.
import { beforeAll, describe, expect, it } from 'vitest';
import { criarBanco } from './helpers.js';

let db;
const membro = async (nome, id) => (await db.query(`insert into public.trello_membros (id_externo, nome) values ($1, $2) returning pessoa_id`, [id, nome])).rows[0].pessoa_id;
const pessoa = async (id) => (await db.query(`select nome, funcao from public.pessoas where id = $1`, [id])).rows[0];

beforeAll(async () => {
  db = await criarBanco();
  await db.query(`insert into public.pessoas (nome) values ('Fulano Willian de Souza (TESTE)'), ('Ana Lima (TESTE)'), ('Ana Paula Lima (TESTE)')`);
});

describe('membro do Trello vira pessoa', () => {
  it('liga à pessoa existente com o mesmo primeiro e último nome, mesmo com grafia diferente no meio', async () => {
    const id = await membro('fulano willam de souza (teste)', 'm1');
    expect(await pessoa(id)).toMatchObject({ nome: 'Fulano Willian de Souza (TESTE)' });
  });

  it('sem correspondência, cria a pessoa como equipe do Trello', async () => {
    const id = await membro('Beltrano Novo (TESTE)', 'm2');
    expect(await pessoa(id)).toEqual({ nome: 'Beltrano Novo (TESTE)', funcao: 'Equipe do Trello' });
  });

  it('com duas correspondências, não adivinha: cria uma pessoa nova', async () => {
    const id = await membro('Ana Lima (TESTE)', 'm3');
    expect(await pessoa(id)).toMatchObject({ funcao: 'Equipe do Trello' });
  });

  it('atualizar o membro não cria outra pessoa', async () => {
    const antes = (await db.query(`select count(*)::int n from public.pessoas`)).rows[0].n;
    await db.query(`update public.trello_membros set usuario = 'x' where id_externo = 'm2'`);
    expect((await db.query(`select count(*)::int n from public.pessoas`)).rows[0].n).toBe(antes);
  });

  it('upsert da sincronização não cria pessoa repetida', async () => {
    const contar = async () => (await db.query(`select count(*)::int n from public.pessoas`)).rows[0].n;
    const antes = await contar();
    for (let i = 0; i < 3; i++) await db.query(`insert into public.trello_membros (id_externo, nome) values ('m3', 'Ana Lima (TESTE)') on conflict (id_externo) do update set nome = excluded.nome`);
    expect(await contar()).toBe(antes);
  });
});
