import { afterEach, describe, expect, it, vi } from 'vitest';
import { cartaoSensivel, listaSensivel, mapearCartao, statusDaLista } from '../src/trello.js';

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

