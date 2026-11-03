// Testes do modelo de dados. Os registros criados aqui são fixtures de teste num banco
// descartável em memória — não representam obras reais.
import { describe, it, expect, beforeAll } from 'vitest';
import { criarBanco, como, PROPRIETARIO, INTRUSO } from './helpers.js';

let db;
beforeAll(async () => {
  db = await criarBanco();
});

async function criarObraTeste(tx, codigo) {
  const { rows } = await tx.query(
    `insert into public.obras (codigo, nome, situacao) values ($1, 'OBRA DE TESTE', 'andamento') returning id`,
    [codigo],
  );
  return rows[0].id;
}

describe('migrations e estrutura', () => {
  it('todas as tabelas de public têm RLS ativo e forçado', async () => {
    const { rows } = await db.query(`
      select c.relname, c.relrowsecurity, c.relforcerowsecurity
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'`);
    expect(rows.length).toBeGreaterThanOrEqual(25);
    const semRls = rows.filter((r) => !r.relrowsecurity || !r.relforcerowsecurity).map((r) => r.relname);
    expect(semRls).toEqual([]);
  });

  it('toda tabela de public tem a política do proprietário', async () => {
    const { rows } = await db.query(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and not exists (select 1 from pg_policies p where p.schemaname = 'public'
                        and p.tablename = c.relname and p.policyname = 'proprietario_total')`);
    expect(rows).toEqual([]);
  });

  it('todas as views usam security_invoker', async () => {
    const { rows } = await db.query(`
      select c.relname, c.reloptions from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'v'`);
    expect(rows.length).toBeGreaterThanOrEqual(5);
    for (const v of rows) expect(v.reloptions ?? []).toContain('security_invoker=on');
  });
});

describe('segurança (RLS)', () => {
  it('anônimo não lê nem grava nada', async () => {
    await expect(como(db, 'anon', null, (tx) => tx.query('select * from public.obras'))).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      como(db, 'anon', null, (tx) => tx.query(`insert into public.obras (codigo, nome) values ('X', 'X')`)),
    ).rejects.toThrow(/permission denied/);
  });

  it('proprietário grava e lê; outro usuário autenticado não vê nada e não grava', async () => {
    await como(db, 'authenticated', PROPRIETARIO, (tx) => criarObraTeste(tx, 'T-RLS'));

    const doDono = await como(db, 'authenticated', PROPRIETARIO, (tx) =>
      tx.query(`select codigo from public.obras where codigo = 'T-RLS'`),
    );
    expect(doDono.rows).toHaveLength(1);

    const doIntruso = await como(db, 'authenticated', INTRUSO, (tx) => tx.query('select * from public.obras'));
    expect(doIntruso.rows).toHaveLength(0);

    await expect(
      como(db, 'authenticated', INTRUSO, (tx) => criarObraTeste(tx, 'T-INTRUSO')),
    ).rejects.toThrow(/row-level security/);
  });

  it('views respeitam o RLS de quem consulta', async () => {
    const r = await como(db, 'authenticated', INTRUSO, (tx) => tx.query('select * from public.v_obra_resumo'));
    expect(r.rows).toHaveLength(0);
  });
});

describe('sincronização idempotente', () => {
  it('reimportar o mesmo id externo atualiza em vez de duplicar', async () => {
    const upsert = `
      insert into public.tarefas (titulo, fonte, id_externo, hash_conteudo, importado_em, status_sync)
      values ($1, 'trello', 'card-123', $2, now(), 'sincronizado')
      on conflict (fonte, id_externo) do update
        set titulo = excluded.titulo, hash_conteudo = excluded.hash_conteudo
      where public.tarefas.hash_conteudo is distinct from excluded.hash_conteudo`;
    await como(db, 'authenticated', PROPRIETARIO, async (tx) => {
      await tx.query(upsert, ['Cartão v1', 'h1']);
      await tx.query(upsert, ['Cartão v1', 'h1']);
      await tx.query(upsert, ['Cartão v2', 'h2']);
    });
    const { rows } = await db.query(`select titulo from public.tarefas where fonte = 'trello' and id_externo = 'card-123'`);
    expect(rows).toEqual([{ titulo: 'Cartão v2' }]);
  });

  it('registros manuais (sem id externo) não colidem entre si', async () => {
    await como(db, 'authenticated', PROPRIETARIO, async (tx) => {
      await tx.query(`insert into public.tarefas (titulo) values ('manual A'), ('manual B')`);
    });
    const { rows } = await db.query(`select count(*)::int n from public.tarefas where fonte = 'manual'`);
    expect(rows[0].n).toBeGreaterThanOrEqual(2);
  });
});

describe('auditoria', () => {
  it('registra antes/depois e o usuário em inserções e alterações', async () => {
    const id = await como(db, 'authenticated', PROPRIETARIO, (tx) => criarObraTeste(tx, 'T-AUD'));
    await como(db, 'authenticated', PROPRIETARIO, (tx) =>
      tx.query(`update public.obras set situacao = 'paralisada' where id = $1`, [id]),
    );
    const { rows } = await db.query(
      `select operacao, usuario_id, antes->>'situacao' antes, depois->>'situacao' depois
       from app.auditoria where tabela = 'obras' and registro_id = $1 order by id`,
      [id],
    );
    expect(rows.map((r) => r.operacao)).toEqual(['INSERT', 'UPDATE']);
    expect(rows[1]).toMatchObject({ antes: 'andamento', depois: 'paralisada', usuario_id: PROPRIETARIO });
  });

  it('atualizado_em é renovado no UPDATE', async () => {
    const { rows } = await db.query(`
      select atualizado_em > criado_em as renovado from public.obras where codigo = 'T-AUD'`);
    expect(rows[0].renovado).toBe(true);
  });
});

describe('regras contratuais e financeiras', () => {
  let contratoId;

  beforeAll(async () => {
    contratoId = await como(db, 'authenticated', PROPRIETARIO, async (tx) => {
      const obraId = await criarObraTeste(tx, 'T-FIN');
      const c = await tx.query(
        `insert into public.contratos (obra_id, numero, valor_original, data_termino_original)
         values ($1, 'CT-TESTE', 1000000.00, '2026-12-31') returning id`,
        [obraId],
      );
      const id = c.rows[0].id;
      await tx.query(
        `insert into public.aditivos (contrato_id, numero, tipo, valor_delta, dias_delta, situacao) values
          ($1, '1', 'acrescimo', 200000.00, 0, 'aprovado'),
          ($1, '2', 'supressao', -50000.00, 0, 'aprovado'),
          ($1, '3', 'prazo', 0, 60, 'aprovado'),
          ($1, '4', 'acrescimo', 999999.00, 0, 'em_analise')`,
        [id],
      );
      await tx.query(
        `insert into public.medicoes (contrato_id, numero, periodo_inicio, periodo_fim, valor_medido, valor_glosado, situacao) values
          ($1, 1, '2026-01-01', '2026-01-31', 300000.00, 10000.00, 'aprovada'),
          ($1, 2, '2026-02-01', '2026-02-28', 100000.00, 0, 'elaborada')`,
        [id],
      );
      await tx.query(
        `insert into public.lancamentos_financeiros (contrato_id, tipo, valor, data_efetiva) values
          ($1, 'faturamento', 290000.00, '2026-02-05'),
          ($1, 'recebimento', 250000.00, '2026-03-05')`,
        [id],
      );
      return id;
    });
  });

  it('separa contratado, medido, faturado, recebido e saldos', async () => {
    const { rows } = await db.query(`select * from public.v_contratos_resumo where contrato_id = $1`, [contratoId]);
    const r = rows[0];
    expect(Number(r.valor_contratado)).toBe(1150000); // 1.000.000 + 200.000 − 50.000 (em análise não entra)
    expect(Number(r.valor_medido)).toBe(290000); // só aprovada, líquida de glosa
    expect(Number(r.valor_faturado)).toBe(290000);
    expect(Number(r.valor_recebido)).toBe(250000);
    expect(Number(r.saldo_a_medir)).toBe(860000);
    expect(Number(r.saldo_a_receber)).toBe(40000);
    expect(r.data_termino_vigente.toISOString().slice(0, 10)).toBe('2027-03-01'); // +60 dias
  });

  it('supressão com valor positivo é rejeitada', async () => {
    await expect(
      como(db, 'authenticated', PROPRIETARIO, (tx) =>
        tx.query(
          `insert into public.aditivos (contrato_id, numero, tipo, valor_delta) values ($1, '9', 'supressao', 100)`,
          [contratoId],
        ),
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it('número de medição não se repete no mesmo contrato', async () => {
    await expect(
      como(db, 'authenticated', PROPRIETARIO, (tx) =>
        tx.query(
          `insert into public.medicoes (contrato_id, numero, periodo_inicio, periodo_fim, valor_medido)
           values ($1, 1, '2026-03-01', '2026-03-31', 1)`,
          [contratoId],
        ),
      ),
    ).rejects.toThrow(/unique/);
  });
});

describe('priorização de tarefas', () => {
  it('tarefa vencida tem urgência máxima e o prazo não é alterado', async () => {
    await como(db, 'authenticated', PROPRIETARIO, (tx) =>
      tx.query(`insert into public.tarefas (titulo, prazo, importancia, impacto) values
        ('vencida', app.hoje() - 3, 3, 3), ('futura', app.hoje() + 30, 3, 3)`),
    );
    const { rows } = await db.query(`
      select titulo, urgencia, escore, vencida, prazo = app.hoje() - 3 as prazo_intacto
      from public.v_tarefas_priorizadas where titulo in ('vencida','futura') order by escore desc`);
    expect(rows[0]).toMatchObject({ titulo: 'vencida', urgencia: 5, escore: 27, vencida: true, prazo_intacto: true });
    expect(rows[1]).toMatchObject({ titulo: 'futura', urgencia: 1, escore: 15 });
  });

  it('aguardando terceiro exige indicar quem', async () => {
    await expect(
      como(db, 'authenticated', PROPRIETARIO, (tx) =>
        tx.query(`insert into public.tarefas (titulo, status) values ('x', 'aguardando_terceiro')`),
      ),
    ).rejects.toThrow(/check constraint/);
  });
});

describe('conectores', () => {
  it('modo leitura_escrita exige autorização registrada', async () => {
    await expect(
      como(db, 'authenticated', PROPRIETARIO, (tx) =>
        tx.query(`insert into public.conectores (ferramenta, nome_exibicao, modo) values ('trello', 'Trello', 'leitura_escrita')`),
      ),
    ).rejects.toThrow(/check constraint/);
  });
});

describe('documentos', () => {
  it('busca por conteúdo em português (com flexão)', async () => {
    await como(db, 'authenticated', PROPRIETARIO, (tx) =>
      tx.query(`insert into public.documentos (titulo, texto_extraido, drive_file_id, categoria)
                values ('Ofício de teste', 'solicitação de reequilíbrio econômico-financeiro do contrato', 'drive-x', 'oficios_requerimentos')`),
    );
    const { rows } = await db.query(
      `select titulo from public.documentos where busca @@ websearch_to_tsquery('portuguese', 'contratos reequilíbrio')`,
    );
    expect(rows.map((r) => r.titulo)).toContain('Ofício de teste');
  });
});
