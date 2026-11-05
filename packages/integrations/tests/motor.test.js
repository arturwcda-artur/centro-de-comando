import { describe, expect, it } from 'vitest';
import { aplicar, executarConector } from '../src/motor.js';

/** Banco falso mínimo: só o que o motor usa (select…eq…range e upsert por fonte+id_externo). */
function bancoFalso() {
  const linhas = [];
  const chamadas = [];
  const cliente = {
    from(tabela) {
      return {
        select() {
          const q = { filtro: {}, eq(c, v) { q.filtro[c] = v; return q; }, range(de, ate) {
            const dados = linhas.filter((l) => l._tabela === tabela && Object.entries(q.filtro).every(([c, v]) => l[c] === v)).slice(de, ate + 1);
            return Promise.resolve({ data: dados, error: null });
          } };
          return q;
        },
        upsert(lote) {
          chamadas.push(lote);
          for (const r of lote) {
            const i = linhas.findIndex((l) => l._tabela === tabela && l.fonte === r.fonte && l.id_externo === r.id_externo);
            if (i >= 0) linhas[i] = { ...linhas[i], ...r };
            else linhas.push({ _tabela: tabela, id: `id-${linhas.length}`, ...r });
          }
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return { cliente, linhas, chamadas };
}

describe('motor de sincronização', () => {
  it('cria, depois ignora o que não mudou e atualiza só o que mudou (idempotente)', async () => {
    const { cliente, linhas, chamadas } = bancoFalso();
    const registros = [
      { id_externo: 'a', titulo: 'A' },
      { id_externo: 'b', titulo: 'B' },
    ];
    const r1 = await aplicar(cliente, { tabela: 'tarefas', fonte: 'trello', registros, agora: 'T1' });
    expect(r1).toMatchObject({ lidos: 2, criados: 2, atualizados: 0, ignorados: 0 });

    const r2 = await aplicar(cliente, { tabela: 'tarefas', fonte: 'trello', registros, agora: 'T2' });
    expect(r2).toMatchObject({ criados: 0, atualizados: 0, ignorados: 2 });

    const r3 = await aplicar(cliente, { tabela: 'tarefas', fonte: 'trello', registros: [{ id_externo: 'a', titulo: 'A2' }, registros[1]], agora: 'T3' });
    expect(r3).toMatchObject({ criados: 0, atualizados: 1, ignorados: 1 });

    expect(linhas).toHaveLength(2);
    expect(linhas.find((l) => l.id_externo === 'a')).toMatchObject({ titulo: 'A2', importado_em: 'T1', status_sync: 'sincronizado' });
    // lote de alterados não leva importado_em (não sobrescreve a data da primeira importação)
    expect(chamadas.at(-1).every((l) => !('importado_em' in l))).toBe(true);
  });

  it('fontes diferentes não se misturam', async () => {
    const { cliente } = bancoFalso();
    await aplicar(cliente, { tabela: 'tarefas', fonte: 'trello', registros: [{ id_externo: 'x', titulo: 'T' }] });
    const r = await aplicar(cliente, { tabela: 'tarefas', fonte: 'notion', registros: [{ id_externo: 'x', titulo: 'N' }] });
    expect(r.criados).toBe(1);
  });
});

describe('conector pausado', () => {
  const cliente = (pausado_ate) => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { pausado_ate } }) }) }) }),
  });

  it('não executa a leitura', async () => {
    let executou = false;
    const r = await executarConector(cliente('2100-01-01T00:00:00Z'), { ferramenta: 'trello', nome: 'Trello' }, async () => {
      executou = true;
    });
    expect(executou).toBe(false);
    expect(r).toMatchObject({ ok: true, lidos: 0 });
  });
});
