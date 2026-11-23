import { describe, expect, it } from 'vitest';
import { compararRevisao, conferirRevisoes } from '../src/conferencia.js';

// Dados de TESTE.
const av = { id: 'av1', decisao_id: 'd1', obra_id: 'o1', versao_id: 'v6', atividade_uid: 12, atividade_nome: '1.4.2 Estacas', inicio_esperado: '2026-12-14', fim_esperado: '2026-12-18', termino_depois: '2027-07-19', decidido_em: '2026-11-23T18:00:00+00:00' };

describe('compararRevisao', () => {
  it('conforme dentro da tolerância de 3 dias corridos', () => {
    const r = compararRevisao(av, { inicio_previsto: '2026-12-15', fim_previsto: '2026-12-19' }, '2027-07-21');
    expect(r.conferencia).toBe('conforme');
  });

  it('divergente aponta o que ficou diferente', () => {
    const r = compararRevisao(av, { inicio_previsto: '2026-12-14', fim_previsto: '2026-12-30' }, '2027-08-02');
    expect(r.conferencia).toBe('divergente');
    expect(r.detalhe).toContain('fim esperado 18/12/2026, na revisão 30/12/2026');
    expect(r.detalhe).toContain('Término da obra esperado 19/07/2027, na revisão 02/08/2027 (+14 dias corridos)');
  });

  it('atividade sumida da revisão é divergência', () => {
    expect(compararRevisao(av, null, '2027-07-19').detalhe).toContain('não foi encontrada');
  });
});

/** Banco falso com as tabelas que a conferência usa. */
function bancoFalso({ vigente, alvo, termino, tarefa }) {
  const gravado = { avaliacao: null, tarefa: null };
  const consulta = (tabela) => {
    const q = {
      filtros: {},
      select: () => q,
      eq: (c, v) => ((q.filtros[c] = v), q),
      is: () => q,
      not: () => q,
      order: () => q,
      limit: async () => ({ data: termino ? [{ fim_previsto: termino }] : [] }),
      maybeSingle: async () => ({
        data: { cronograma_versoes: vigente, atividades_cronograma: alvo, decisoes: { tarefa_planejamento_id: 't9' }, tarefas: tarefa }[tabela] ?? null,
      }),
      update: (valores) => ({ eq: (..._) => ((gravado[tabela === 'tarefas' ? 'tarefa' : 'avaliacao'] = valores), { eq: async () => ({ error: null }), then: (ok) => ok({ error: null }) }) }),
      then: (ok) => ok({ data: tabela === 'avaliacoes_planejamento' ? [av] : [], error: null }),
    };
    return q;
  };
  return { gravado, from: consulta };
}

describe('conferirRevisoes', () => {
  it('sem revisão nova depois da aprovação, espera', async () => {
    const banco = bancoFalso({ vigente: { id: 'v6', nome: 'REV-06', importado_em: '2026-11-20T10:00:00+00:00' } });
    expect(await conferirRevisoes(banco)).toEqual({ conformes: 0, divergentes: 0, aguardando: 1 });
    expect(banco.gravado.avaliacao).toBeNull();
  });

  it('revisão conforme conclui a tarefa de atualizar o cronograma', async () => {
    const banco = bancoFalso({
      vigente: { id: 'v7', nome: 'REV-07', importado_em: '2026-11-25T10:00:00+00:00' },
      alvo: { inicio_previsto: '2026-12-14', fim_previsto: '2026-12-18' },
      termino: '2027-07-19',
      tarefa: { descricao: 'Rota…', status: 'a_fazer' },
    });
    expect(await conferirRevisoes(banco)).toEqual({ conformes: 1, divergentes: 0, aguardando: 0 });
    expect(banco.gravado.avaliacao).toMatchObject({ versao_conferida_id: 'v7', conferencia: 'conforme' });
    expect(banco.gravado.tarefa).toMatchObject({ status: 'concluida' });
    expect(banco.gravado.tarefa.descricao).toMatch(/^Conferência da revisão REV-07: conforme/);
  });

  it('revisão divergente deixa a tarefa aberta com o que ficou diferente', async () => {
    const banco = bancoFalso({
      vigente: { id: 'v7', nome: 'REV-07', importado_em: '2026-11-25T10:00:00+00:00' },
      alvo: { inicio_previsto: '2026-12-14', fim_previsto: '2026-12-18' },
      termino: '2027-09-01',
      tarefa: { descricao: 'Rota…', status: 'a_fazer' },
    });
    expect(await conferirRevisoes(banco)).toEqual({ conformes: 0, divergentes: 1, aguardando: 0 });
    expect(banco.gravado.tarefa.status).toBeUndefined();
    expect(banco.gravado.tarefa.descricao).toContain('divergente');
  });
});
