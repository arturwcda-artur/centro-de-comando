// Carrega um backup em um PostgreSQL descartável na memória (PGlite) e imprime as contagens em JSON.
// Uso: node restaurar-backup.mjs <antes.sql> <depois.sql>. Chamado por cc_agente.restauracao.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const [antes, depois] = process.argv.slice(2);

/** Executa um arquivo gerado pelo pg_restore. As linhas de COPY vão pelo arquivo virtual do PGlite. */
async function carregar(db, caminho) {
  const linhas = readFileSync(caminho, 'utf8').split('\n');
  let comandos = [];
  const executar = async () => {
    const texto = comandos.join('\n').trim();
    comandos = [];
    if (!texto) return;
    try {
      await db.exec(texto);
    } catch (e) {
      // Sem repetir o SQL: ele pode ter dados do sistema
      console.error(`Falha ao carregar: ${e.message}`);
      process.exit(1);
    }
  };
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    if (linha.startsWith('\\') || /^SET transaction_timeout|^CREATE SCHEMA public;|^COMMENT ON SCHEMA public/.test(linha)) continue;
    const copia = /^(COPY .*) FROM stdin;$/.exec(linha);
    if (!copia) {
      comandos.push(linha);
      continue;
    }
    await executar();
    const dados = [];
    for (i++; linhas[i] !== '\\.'; i++) dados.push(linhas[i]);
    if (dados.length) await db.query(`${copia[1]} FROM '/dev/blob'`, [], { blob: new Blob([`${dados.join('\n')}\n`]) });
  }
  await executar();
}

const db = new PGlite();
await db.exec(readFileSync(join(aqui, '..', 'tests', 'supabase_stub.sql'), 'utf8'));
await carregar(db, antes);
// O login fica em auth.users, fora do backup: recria o proprietário, como na recuperação real
await db.exec(`insert into auth.users (id) select user_id from app.proprietario on conflict do nothing`);
await carregar(db, depois);

const tabelas = await db.query(`select schemaname s, tablename t from pg_tables where schemaname in ('public', 'app') order by 1, 2`);
const contagens = {};
for (const { s, t } of tabelas.rows) contagens[`${s}.${t}`] = (await db.query(`select count(*)::int n from "${s}"."${t}"`)).rows[0].n;
const restricoes = (await db.query(`select count(*)::int n from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname in ('public', 'app') and c.contype = 'f'`)).rows[0].n;
const politicas = (await db.query(`select count(*)::int n from pg_policies where schemaname in ('public', 'app')`)).rows[0].n;
console.log(JSON.stringify({ contagens, restricoes, politicas }));
await db.close();
