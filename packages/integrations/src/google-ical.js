/**
 * Conector Google Agenda via endereço secreto iCal — SOMENTE LEITURA (ADR 0012).
 * Fonte oficial dos compromissos (ADR 0004). Expande eventos recorrentes na janela,
 * respeitando EXDATE, exceções (RECURRENCE-ID) e cancelamentos.
 */
import ICAL from 'ical.js';
import { buscar, cortar } from './util.js';

const MAX_OCORRENCIAS = 2000;

function instante(tempo) {
  // Dia inteiro: data civil fixada em São Paulo (o runner do GitHub está em UTC)
  if (tempo.isDate) return `${tempo.toString()}T00:00:00-03:00`;
  return tempo.toJSDate().toISOString();
}

/**
 * Converte o texto .ics em eventos espelho dentro da janela [inicio, fim) (datas civis AAAA-MM-DD).
 * @returns {{calendario: string, registros: object[]}}
 */
export function mapearIcs(texto, { inicio, fim, rotulo }) {
  const raiz = new ICAL.Component(ICAL.parse(texto));
  for (const tz of raiz.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(tz);
  const calendario = rotulo || raiz.getFirstPropertyValue('x-wr-calname') || 'Google Agenda';
  const janelaInicio = ICAL.Time.fromDateTimeString(`${inicio}T00:00:00`);
  const janelaFim = ICAL.Time.fromDateTimeString(`${fim}T00:00:00`);

  const mestres = new Map();
  const excecoes = [];
  for (const ve of raiz.getAllSubcomponents('vevent')) {
    const ev = new ICAL.Event(ve);
    if (ev.isRecurrenceException()) excecoes.push(ev);
    else mestres.set(ev.uid, ev);
  }
  for (const ex of excecoes) mestres.get(ex.uid)?.relateException(ex);

  const registros = [];
  const empurrar = (ev, componente, inicioT, fimT, chave) => {
    if ((componente.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED') return;
    const modificado = componente.getFirstPropertyValue('last-modified');
    registros.push({
      id_externo: `${calendario}|${ev.uid}|${chave}`,
      titulo: cortar(ev.summary, 300) ?? '(sem título)',
      descricao: cortar(ev.description, 4000),
      inicio: instante(inicioT),
      fim: fimT ? instante(fimT) : null,
      dia_inteiro: inicioT.isDate,
      local: cortar(ev.location, 300),
      calendario_externo_id: cortar(calendario, 200),
      ical_uid: ev.uid,
      atualizado_em_origem: modificado ? modificado.toJSDate().toISOString() : null,
      cancelado_em: null,
    });
  };

  for (const ev of mestres.values()) {
    if (!ev.isRecurring()) {
      if (ev.endDate.compare(janelaInicio) > 0 && ev.startDate.compare(janelaFim) < 0) {
        empurrar(ev, ev.component, ev.startDate, ev.endDate, ev.startDate.toString());
      }
      continue;
    }
    const it = ev.iterator();
    for (let n = 0, prox = it.next(); prox && n < MAX_OCORRENCIAS; n++, prox = it.next()) {
      if (prox.compare(janelaFim) >= 0) break;
      const det = ev.getOccurrenceDetails(prox);
      if (det.endDate.compare(janelaInicio) <= 0) continue;
      empurrar(det.item, det.item.component, det.startDate, det.endDate, det.recurrenceId.toString());
    }
  }
  return { calendario, registros };
}

/** Lê um endereço iCal (o endereço é segredo: nunca é registrado em log). */
export async function lerIcal(url, janela, indice) {
  const r = await buscar(url, { headers: { Accept: 'text/calendar' } }, `Google Agenda (agenda ${indice + 1})`);
  return mapearIcs(await r.text(), janela);
}

/**
 * Eventos da janela que sumiram da agenda de origem → cancelado_em (nunca apagados).
 * Também "descancela" é feito pelo upsert, que grava cancelado_em = null.
 */
export async function cancelarAusentes(supabase, { calendario, inicioISO, fimISO, idsPresentes }) {
  const { data, error } = await supabase
    .from('eventos')
    .select('id, id_externo')
    .eq('fonte', 'google_agenda')
    .eq('calendario_externo_id', calendario)
    .is('cancelado_em', null)
    .gte('inicio', inicioISO)
    .lt('inicio', fimISO);
  if (error) throw new Error(`leitura de eventos: ${error.message}`);
  const presentes = new Set(idsPresentes);
  const ausentes = data.filter((e) => !presentes.has(e.id_externo)).map((e) => e.id);
  if (ausentes.length) {
    const { error: e2 } = await supabase.from('eventos').update({ cancelado_em: new Date().toISOString(), hash_conteudo: null }).in('id', ausentes);
    if (e2) throw new Error(`cancelamento de eventos ausentes: ${e2.message}`);
  }
  return ausentes.length;
}
