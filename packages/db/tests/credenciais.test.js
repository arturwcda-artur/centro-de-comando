// Credenciais no cofre (migration 0018). Valores de TESTE em banco descartável.
import { describe, it, expect, beforeAll } from 'vitest';
import { criarBanco, como, PROPRIETARIO, INTRUSO } from './helpers.js';

let db;
beforeAll(async () => {
  db = await criarBanco();
});

const salvar = (tx, v) => tx.query(`select public.salvar_credencial('google', $1)`, [v]);
const ler = (tx) => tx.query(`select public.ler_credencial('google') as v`);

describe('credenciais externas', () => {
  it('o proprietário grava, regrava e lê; regravar não duplica', async () => {
    await como(db, 'authenticated', PROPRIETARIO, (tx) => salvar(tx, 'token-1'));
    await como(db, 'authenticated', PROPRIETARIO, (tx) => salvar(tx, 'token-2'));
    const r = await como(db, 'authenticated', PROPRIETARIO, ler);
    expect(r.rows[0].v).toBe('token-2');
    const n = await db.query(`select count(*)::int n from vault.secrets where name = 'cc_google'`);
    expect(n.rows[0].n).toBe(1);
  });

  it('sem segundo fator, ou outro usuário, não lê nem grava', async () => {
    await expect(como(db, 'authenticated', PROPRIETARIO, ler, { aal: 'aal1' })).rejects.toThrow(/Sem permissão/);
    await expect(como(db, 'authenticated', INTRUSO, ler)).rejects.toThrow(/Sem permissão/);
    await expect(como(db, 'authenticated', INTRUSO, (tx) => salvar(tx, 'x'))).rejects.toThrow(/Sem permissão/);
  });

  it('anônimo não chama nenhuma função; usuário logado não usa a função de serviço', async () => {
    await expect(como(db, 'anon', null, ler)).rejects.toThrow(/permission denied/);
    await expect(
      como(db, 'authenticated', PROPRIETARIO, (tx) => tx.query(`select public.ler_credencial_servico('google')`)),
    ).rejects.toThrow(/permission denied/);
  });

  it('a chave de serviço lê pela função própria', async () => {
    const r = await como(db, 'service_role', null, (tx) => tx.query(`select public.ler_credencial_servico('google') as v`));
    expect(r.rows[0].v).toBe('token-2');
  });
});
