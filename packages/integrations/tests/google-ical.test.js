import { describe, expect, it } from 'vitest';
import { mapearIcs } from '../src/google-ical.js';

// Agenda de TESTE (não é a agenda real): fuso São Paulo, evento semanal com uma exclusão
// e uma exceção remarcada, evento de dia inteiro, evento cancelado e evento fora da janela.
const ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Teste//PT
X-WR-CALNAME:Agenda de teste
BEGIN:VTIMEZONE
TZID:America/Sao_Paulo
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:-0300
TZOFFSETTO:-0300
TZNAME:-03
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:semanal@teste
SUMMARY:Reunião semanal de obra
DTSTART;TZID=America/Sao_Paulo:20261102T090000
DTEND;TZID=America/Sao_Paulo:20261102T100000
RRULE:FREQ=WEEKLY;COUNT=4
EXDATE;TZID=America/Sao_Paulo:20261109T090000
LOCATION:Canteiro
LAST-MODIFIED:20261020T120000Z
END:VEVENT
BEGIN:VEVENT
UID:semanal@teste
RECURRENCE-ID;TZID=America/Sao_Paulo:20261116T090000
SUMMARY:Reunião semanal (remarcada)
DTSTART;TZID=America/Sao_Paulo:20261116T140000
DTEND;TZID=America/Sao_Paulo:20261116T150000
END:VEVENT
BEGIN:VEVENT
UID:feriado@teste
SUMMARY:Feriado de teste
DTSTART;VALUE=DATE:20261115
DTEND;VALUE=DATE:20261116
END:VEVENT
BEGIN:VEVENT
UID:cancelado@teste
SUMMARY:Evento cancelado
STATUS:CANCELLED
DTSTART:20261104T130000Z
DTEND:20261104T140000Z
END:VEVENT
BEGIN:VEVENT
UID:antigo@teste
SUMMARY:Fora da janela
DTSTART:20250101T130000Z
DTEND:20250101T140000Z
END:VEVENT
END:VCALENDAR`.replace(/\n/g, '\r\n');

const { calendario, registros } = mapearIcs(ICS, { inicio: '2026-11-01', fim: '2026-12-31' });
const porTitulo = (t) => registros.filter((r) => r.titulo === t);

describe('Google Agenda via iCal', () => {
  it('usa o nome da agenda e ignora cancelados e eventos fora da janela', () => {
    expect(calendario).toBe('Agenda de teste');
    expect(porTitulo('Evento cancelado')).toHaveLength(0);
    expect(porTitulo('Fora da janela')).toHaveLength(0);
  });

  it('expande a recorrência respeitando EXDATE e a exceção remarcada', () => {
    const semanais = registros.filter((r) => r.ical_uid === 'semanal@teste').map((r) => [r.titulo, r.inicio]);
    expect(semanais).toEqual([
      ['Reunião semanal de obra', '2026-11-02T12:00:00.000Z'], // 09:00 em São Paulo
      ['Reunião semanal (remarcada)', '2026-11-16T17:00:00.000Z'], // 14:00 em São Paulo
      ['Reunião semanal de obra', '2026-11-23T12:00:00.000Z'],
    ]);
  });

  it('dia inteiro fica fixado na data civil de São Paulo', () => {
    const [feriado] = porTitulo('Feriado de teste');
    expect(feriado).toMatchObject({ dia_inteiro: true, inicio: '2026-11-15T00:00:00-03:00' });
  });

  it('cada ocorrência tem identificador externo estável e distinto', () => {
    const ids = registros.map((r) => r.id_externo);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('Agenda de teste|semanal@teste|2026-11-16T09:00:00');
    expect(mapearIcs(ICS, { inicio: '2026-11-01', fim: '2026-12-31' }).registros.map((r) => r.id_externo)).toEqual(ids);
  });

  it('todos os registros têm as mesmas colunas (lote homogêneo no upsert)', () => {
    const chaves = new Set(registros.map((r) => Object.keys(r).sort().join(',')));
    expect(chaves.size).toBe(1);
  });
});
