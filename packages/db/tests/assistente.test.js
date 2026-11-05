// Assistente só de leitura (migration 0028). Banco descartável, dados de teste.
import { beforeAll, describe, expect, it } from 'vitest';
import { INTRUSO, PROPRIETARIO, como, criarBanco } from './helpers.js';

const CLIENTE = { clientId: 'cliente-claude' };
let db;
const tarefas = (opcoes = CLIENTE, usuario = PROPRIETARIO) =>
  como(db, 'authenticated', usuario, async (tx) => (await tx.query(`select public.assistente_tarefas() r`)).rows[0].r, opcoes);

beforeAll(async () => {
  db = await criarBanco();
  await db.exec(`
    insert into public.tarefas (titulo, status, categoria) values
      ('Revisar medição', 'a_fazer', 'obras'),
      ('Acesso senha: 123', 'a_fazer', 'obras'),
      ('Cartão pessoal', 'a_fazer', 'Cartoes');
  `);
});

describe('token de cliente OAuth', () => {
  it('não lê tabela mesmo com segundo fator', async () => {
    const n = await como(db, 'authenticated', PROPRIETARIO, async (tx) => (await tx.query(`select count(*)::int n from public.tarefas`)).rows[0].n, CLIENTE);
    expect(n).toBe(0);
  });

  it('não grava em tabela', async () => {
    await expect(como(db, 'authenticated', PROPRIETARIO, (tx) => tx.query(`insert into public.tarefas (titulo) values ('invadida')`), CLIENTE)).rejects.toThrow(/row-level security/);
  });

  it('sessão direta do proprietário continua normal', async () => {
    const n = await como(db, 'authenticated', PROPRIETARIO, async (tx) => (await tx.query(`select count(*)::int n from public.tarefas`)).rows[0].n);
    expect(n).toBe(3);
  });
});

describe('funções do assistente', () => {
  it('devolve tarefas com fonte e data', async () => {
    const r = await tarefas();
    expect(r.fonte).toBeTruthy();
    expect(r.consultado_em).toBeTruthy();
    expect(r.dados.map((t) => t.titulo)).toEqual(['Revisar medição']);
  });

  it('funciona com token sem segundo fator, porque quem autoriza é a tela com login completo', async () => {
    expect((await tarefas({ ...CLIENTE, aal: 'aal1' })).dados).toHaveLength(1);
  });

  it('esconde credencial também nos vencimentos', async () => {
    await db.exec(`update public.tarefas set prazo = app.hoje() + 1`);
    const r = await como(db, 'authenticated', PROPRIETARIO, async (tx) => (await tx.query(`select public.assistente_vencimentos() r`)).rows[0].r, CLIENTE);
    expect(r.dados.map((v) => v.descricao)).toEqual(['Revisar medição']);
  });

  it('filtro de obra não aceita curinga', async () => {
    const r = await como(db, 'authenticated', PROPRIETARIO, async (tx) => (await tx.query(`select public.assistente_tarefas('%') r`)).rows[0].r, CLIENTE);
    expect(r.dados).toEqual([]);
  });

  it('as outras leituras respondem', async () => {
    for (const f of ['assistente_obras', 'assistente_contratos', 'assistente_riscos']) {
      const r = await como(db, 'authenticated', PROPRIETARIO, async (tx) => (await tx.query(`select public.${f}() r`)).rows[0].r, CLIENTE);
      expect(r.fonte).toBeTruthy();
    }
  });

  it('recusa sessão direta, outro usuário e visitante', async () => {
    await expect(tarefas({})).rejects.toThrow(/assistente autorizado/);
    await expect(tarefas(CLIENTE, INTRUSO)).rejects.toThrow(/assistente autorizado/);
    await expect(como(db, 'anon', null, (tx) => tx.query(`select public.assistente_tarefas()`))).rejects.toThrow(/permission denied/);
  });

  it('os auxiliares não ficam expostos', async () => {
    await expect(como(db, 'authenticated', PROPRIETARIO, (tx) => tx.query(`select app.texto_sensivel('x')`), CLIENTE)).rejects.toThrow(/permission denied/);
  });
});
