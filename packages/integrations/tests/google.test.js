import { afterEach, describe, expect, it, vi } from 'vitest';
import { alterarEvento, corpoDoEvento, criarEvento, excluirEvento, listarEventos, mapearEvento, tokenDeAcesso, urlAutorizacao } from '../src/google.js';

// Eventos de TESTE no formato da API. Nenhuma chamada real é feita.
function apiFalsa(resposta) {
  const chamadas = [];
  vi.stubGlobal('fetch', async (url, opcoes = {}) => {
    chamadas.push({ url: String(url), metodo: opcoes.method ?? 'GET', corpo: opcoes.body ? JSON.parse(opcoes.body) : null });
    return new Response(JSON.stringify(resposta(String(url), chamadas.length)), { status: 200 });
  });
  return chamadas;
}
afterEach(() => vi.unstubAllGlobals());

describe('Google Agenda: leitura', () => {
  it('mapeia evento com horário e identificador estável', () => {
    expect(mapearEvento({ id: 'abc_20261116T120000Z', summary: 'Reunião', start: { dateTime: '2026-11-16T09:00:00-03:00' }, end: { dateTime: '2026-11-16T10:00:00-03:00' } })).toMatchObject({
      id_externo: 'primary|abc_20261116T120000Z',
      inicio: '2026-11-16T12:00:00.000Z',
      dia_inteiro: false,
    });
  });

  it('dia inteiro fica na data civil de São Paulo', () => {
    expect(mapearEvento({ id: 'x', start: { date: '2026-11-15' }, end: { date: '2026-11-16' } })).toMatchObject({ dia_inteiro: true, inicio: '2026-11-15T00:00:00-03:00', titulo: '(sem título)' });
  });

  it('pede recorrências expandidas, percorre páginas e ignora cancelados', async () => {
    const c = apiFalsa((_, n) =>
      n === 1
        ? { items: [{ id: 'a', start: { date: '2026-11-15' } }, { id: 'b', status: 'cancelled' }], nextPageToken: 'p2' }
        : { items: [{ id: 'c', start: { date: '2026-11-16' } }] },
    );
    const r = await listarEventos('t', { inicio: '2026-11-01', fim: '2026-12-01' });
    expect(r.map((e) => e.id_externo)).toEqual(['primary|a', 'primary|c']);
    expect(c[0].url).toContain('singleEvents=true');
    expect(c[1].url).toContain('pageToken=p2');
  });
});

describe('Google Agenda: gravação', () => {
  const dados = { titulo: 'Vistoria', local: 'Canteiro', data: '2026-11-10', inicio: '09:00', fim: '10:30', diaInteiro: false };

  it('horários vão no fuso de São Paulo', () => {
    expect(corpoDoEvento(dados)).toMatchObject({ summary: 'Vistoria', start: { dateTime: '2026-11-10T09:00:00', timeZone: 'America/Sao_Paulo' }, end: { dateTime: '2026-11-10T10:30:00' } });
  });

  it('dia inteiro: o fim é o dia seguinte, exclusivo, mesmo na virada do ano', () => {
    expect(corpoDoEvento({ titulo: 'x', data: '2026-12-31', diaInteiro: true })).toMatchObject({ start: { date: '2026-12-31' }, end: { date: '2027-01-01' } });
  });

  it('evento de vários dias mantém a data final', () => {
    expect(corpoDoEvento({ titulo: 'x', data: '2026-11-10', dataFim: '2026-11-12', diaInteiro: true }).end.date).toBe('2026-11-13');
    expect(corpoDoEvento({ ...dados, dataFim: '2026-11-11' }).end.dateTime).toBe('2026-11-11T10:30:00');
  });

  it('campo não informado não é enviado, para não apagar o que está no Google', () => {
    const corpo = JSON.parse(JSON.stringify(corpoDoEvento({ ...dados, descricao: undefined })));
    expect(corpo).not.toHaveProperty('description');
  });

  it('ao trocar entre dia inteiro e horário, limpa o formato anterior', () => {
    expect(corpoDoEvento({ titulo: 'x', data: '2026-11-10', diaInteiro: true }).start).toMatchObject({ date: '2026-11-10', dateTime: null });
    expect(corpoDoEvento(dados).start).toMatchObject({ date: null });
  });

  it('cria, altera e exclui só a ocorrência indicada', async () => {
    const c = apiFalsa(() => ({ id: 'novo_20261110T120000Z', summary: 'Vistoria', start: { dateTime: '2026-11-10T09:00:00-03:00' } }));
    expect((await criarEvento('t', dados)).id_externo).toBe('primary|novo_20261110T120000Z');
    await alterarEvento('t', 'primary|serie_20261110T120000Z', dados);
    await excluirEvento('t', 'primary|serie_20261110T120000Z');
    expect(c.map((x) => x.metodo)).toEqual(['POST', 'PATCH', 'DELETE']);
    expect(c[1].url).toContain('/events/serie_20261110T120000Z');
    expect(c[2].url).toContain('/events/serie_20261110T120000Z');
  });
});

describe('autorização', () => {
  it('autorização revogada aparece como erro de autorização', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 400 }));
    await expect(tokenDeAcesso({ clienteId: 'a', segredo: 'b', tokenLongo: 'c' })).rejects.toThrow(/HTTP 401/);
  });

  it('pede só eventos da agenda e acesso de longa duração', () => {
    const u = new URL(urlAutorizacao({ clienteId: 'id', retorno: 'https://x/retorno', estado: 'abc' }));
    expect(u.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/calendar.events');
    expect(u.searchParams.get('access_type')).toBe('offline');
    expect(u.searchParams.get('state')).toBe('abc');
  });
});
