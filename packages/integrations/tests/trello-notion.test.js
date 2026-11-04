import { afterEach, describe, expect, it, vi } from 'vitest';
import { cartaoSensivel, listaSensivel, mapearCartao, statusDaLista } from '../src/trello.js';
import { BASES_CENTRAL, classificarBase, lerNotion, mapearDemanda, mapearReuniao } from '../src/notion.js';

// Dados de TESTE no formato das APIs — não são cartões ou páginas reais.
describe('Trello', () => {
  it('deduz a situação pelo nome da lista', () => {
    expect(statusDaLista('Concluído')).toBe('concluida');
    expect(statusDaLista('Em andamento')).toBe('em_andamento');
    expect(statusDaLista('A fazer')).toBe('a_fazer');
    expect(statusDaLista(undefined)).toBe('a_fazer');
  });

  it('nunca importa listas de credenciais (RN-66)', () => {
    for (const nome of ['Senhas apps', 'SENHAS', 'Senhás', 'Passwords', 'Credenciais', 'Logins', 'tokens api']) {
      expect(listaSensivel(nome)).toBe(true);
    }
    for (const nome of ['ANP', 'PRF', 'concluidos', 'Cozinha', 'SENADO-PISO ELEVADO', undefined]) {
      expect(listaSensivel(nome)).toBe(false);
    }
  });

  it('nunca importa cartão com credencial no título ou na descrição (RN-66)', () => {
    expect(cartaoSensivel({ name: 'acesso ao portal; senha: abc' })).toBe(true);
    expect(cartaoSensivel({ name: 'Portal', desc: 'usuario x; Password=abc' })).toBe(true);
    expect(cartaoSensivel({ name: 'Trocar a senha do portal' })).toBe(false); // falar de senha não é conter senha
    expect(cartaoSensivel({ name: 'Medição PRF', desc: 'conferir planilha' })).toBe(false);
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

  afterEach(() => vi.unstubAllGlobals());

  it('lê pelos data sources (API 2025-09-03) e só faz consultas', async () => {
    const chamadas = [];
    vi.stubGlobal('fetch', async (url, opcoes) => {
      chamadas.push({ url, versao: opcoes.headers['Notion-Version'], corpo: JSON.parse(opcoes.body) });
      const results = url.endsWith('/search')
        ? [
            { id: 'ds1', title: [{ plain_text: '📋 Demandas Ativas' }] },
            { id: 'ds2', title: [{ plain_text: 'Plano de Leitura' }] },
          ]
        : [pagina, { ...pagina, id: 'p2', in_trash: true }];
      return new Response(JSON.stringify({ results, has_more: false }), { status: 200 });
    });

    const r = await lerNotion('token-de-teste');

    const consultadas = chamadas.map((c) => c.url.replace('https://api.notion.com/v1', ''));
    expect(consultadas[0]).toBe('/search');
    expect(consultadas).toContain('/data_sources/ds1/query');
    expect(consultadas).not.toContain('/data_sources/ds2/query'); // "Plano de Leitura" não é usada
    for (const b of BASES_CENTRAL) expect(consultadas).toContain(`/data_sources/${b.id}/query`); // sem depender da busca
    expect(chamadas[0].corpo.filter).toEqual({ property: 'object', value: 'data_source' });
    expect(chamadas[0].versao).toBe('2025-09-03');
    expect(r.bases).toEqual(['Demandas Ativas', 'Histórico de Reuniões', '📋 Demandas Ativas']);
    expect(r.reunioes.map((x) => x.id_externo)).toEqual(['p1']);
    expect(r.tarefas.every((t) => t.id_externo === 'p1')).toBe(true); // a da lixeira fica de fora
  });

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
