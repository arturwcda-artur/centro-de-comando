import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
export const pastaMigrations = join(aqui, '..', 'migrations');

export const PROPRIETARIO = '00000000-0000-4000-8000-000000000001';
export const INTRUSO = '00000000-0000-4000-8000-000000000002';

export function listarMigrations() {
  return readdirSync(pastaMigrations).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
}

/** Banco descartável em memória com stub do Supabase + todas as migrations. */
export async function criarBanco() {
  const db = new PGlite();
  await db.exec(readFileSync(join(aqui, 'supabase_stub.sql'), 'utf8'));
  for (const arquivo of listarMigrations()) {
    try {
      await db.exec(readFileSync(join(pastaMigrations, arquivo), 'utf8'));
    } catch (e) {
      throw new Error(`Falha na migration ${arquivo}: ${e.message}`);
    }
  }
  await db.query(`insert into auth.users (id) values ($1), ($2)`, [PROPRIETARIO, INTRUSO]);
  await db.query(`insert into app.proprietario (user_id) values ($1)`, [PROPRIETARIO]);
  return db;
}

/** Executa fn numa transação com o papel e o usuário informados (simula a API do Supabase). */
export async function como(db, papel, usuario, fn) {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [usuario ?? '']);
    await tx.exec(`set local role ${papel}`);
    return fn(tx);
  });
}
