// Gera docs/DICIONARIO_DE_DADOS.md a partir das migrations (aplicadas num banco descartável).
// Uso: npm run dicionario -w @cc/db
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarBanco } from '../tests/helpers.js';

const destino = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'docs', 'DICIONARIO_DE_DADOS.md');
const db = await criarBanco();

const { rows: tabelas } = await db.query(`
  select c.relname as nome, c.relkind as tipo, obj_description(c.oid) as descricao
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','v')
  order by c.relkind, c.relname`);

const { rows: colunas } = await db.query(`
  select c.relname as tabela, a.attname as coluna, format_type(a.atttypid, a.atttypmod) as tipo,
         a.attnotnull as obrigatoria, col_description(c.oid, a.attnum) as descricao,
         (select string_agg(cf.relname, ', ') from pg_constraint k join pg_class cf on cf.oid = k.confrelid
           where k.conrelid = c.oid and k.contype = 'f' and a.attnum = any (k.conkey)) as referencia
  from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','v') and a.attnum > 0 and not a.attisdropped
  order by c.relname, a.attnum`);

const linhas = [
  '# Dicionário de Dados',
  '',
  '> Gerado automaticamente por `packages/db/scripts/gerar-dicionario.js` a partir das migrations. Não edite à mão.',
  '',
];
for (const t of tabelas) {
  linhas.push(`## ${t.tipo === 'v' ? 'View' : 'Tabela'} \`${t.nome}\``, '');
  if (t.descricao) linhas.push(t.descricao, '');
  linhas.push('| Coluna | Tipo | Obrigatória | Referência | Descrição |', '|---|---|---|---|---|');
  for (const c of colunas.filter((c) => c.tabela === t.nome)) {
    linhas.push(
      `| ${c.coluna} | ${c.tipo} | ${c.obrigatoria ? 'sim' : ''} | ${c.referencia ?? ''} | ${(c.descricao ?? '').replace(/\|/g, '/')} |`,
    );
  }
  linhas.push('');
}
writeFileSync(destino, linhas.join('\n'));
console.log(`Dicionário gerado: ${tabelas.length} objetos -> ${destino}`);
