import { describe, expect, it } from 'vitest';
import { mapearCartao, statusDaLista } from '../src/trello.js';
import { classificarBase, mapearDemanda, mapearReuniao } from '../src/notion.js';

// Dados de TESTE no formato das APIs — não são cartões ou páginas reais.
describe('Trello', () => {
  it('deduz a situação pelo nome da lista', () => {
    expect(statusDaLista('Concluído')).toBe('concluida');
    expect(statusDaLista('Em andamento')).toBe('em_andamento');
    expect(statusDaLista('A fazer')).toBe('a_fazer');
    expect(statusDaLista(undefined)).toBe('a_fazer');
  });

  const base = { id: 'c1', name: 'Cotar aço', desc: 'CA-50', due: '2026-11-05T02:00:00.000Z', dueComplete: false, idMembers: ['eu'], url: 'https://trello.com/c/x', dateLastActivity: '2026-11-01T10:00:00.000Z' };

  it('mapeia o cartão com prazo na data de São Paulo e sem responsável quando é meu', () => {
    expect(mapearCartao(base, { quadro: 'Obras', lista: 'A fazer', meuId: 'eu', idEquipe: 'EQ' })).toMatchObject({
      id_externo: 'c1',
      titulo: 'Cotar aço',
      prazo: '2026-11-04', // 02:00 UTC do dia 5 = 23:00 do dia 4 em São Paulo
      status: 'a_fazer',
      concluida_em: null,
      categoria: 'Obras › A fazer',
      responsavel_id: null,
    });
  });

  it('cartão de outro membro vai para a pessoa da equipe; concluído traz data de conclusão', () => {
    const r = mapearCartao({ ...base, idMembers: ['outro'], dueComplete: true }, { quadro: 'Obras', lista: 'A fazer', meuId: 'eu', idEquipe: 'EQ' });
    expect(r).toMatchObject({ responsavel_id: 'EQ', status: 'concluida', concluida_em: '2026-11-01T10:00:00.000Z' });
  });
});

describe('Notion', () => {
  const pagina = {
    id: 'p1',
    url: 'https://notion.so/p1',
    last_edited_time: '2026-05-11T16:00:00.000Z',
    created_time: '2026-05-10T12:00:00.000Z',
    properties: {
      Nome: { type: 'title', title: [{ plain_text: 'Medição Senado' }] },
      Prazo: { type: 'date', date: { start: '2026-05-20' } },
      Status: { type: 'status', status: { name: 'Concluído' } },
    },
  };

  it('classifica as bases pelo título', () => {
    expect(classificarBase('📋 Demandas Ativas')).toBe('tarefas');
    expect(classificarBase('📁 Histórico de Reuniões')).toBe('reunioes');
    expect(classificarBase('Plano de Leitura')).toBeNull();
  });

  it('demanda vira tarefa com prazo e conclusão', () => {
    expect(mapearDemanda(pagina, 'Demandas Ativas')).toMatchObject({
      id_externo: 'p1',
      titulo: 'Medição Senado',
      prazo: '2026-05-20',
      status: 'concluida',
      concluida_em: '2026-05-11T16:00:00.000Z',
      categoria: 'Notion › Demandas Ativas',
    });
    const aberta = mapearDemanda({ ...pagina, properties: { ...pagina.properties, Status: { type: 'status', status: { name: 'Em andamento' } } } }, 'Demandas');
    expect(aberta).toMatchObject({ status: 'a_fazer', concluida_em: null });
  });

  it('reunião sem data usa a data de criação', () => {
    const { Prazo: _, ...semData } = pagina.properties;
    expect(mapearReuniao({ ...pagina, properties: semData })).toMatchObject({ titulo: 'Medição Senado', data: '2026-05-10' });
  });
});
