/**
 * Conector Google Agenda pela API oficial (ADR 0014): lê os eventos e, na aplicação, cria, altera
 * e exclui. Atua só na agenda principal do proprietário. Tokens nunca são registrados em log.
 */
import { buscar, cortar, somarDias } from './util.js';

const API = 'https://www.googleapis.com/calendar/v3';
const TOKEN = 'https://oauth2.googleapis.com/token';
export const ESCOPO = 'https://www.googleapis.com/auth/calendar.events';
export const AGENDA = 'primary';
export const FUSO = 'America/Sao_Paulo';

export function urlAutorizacao({ clienteId, retorno, estado }) {
  const qs = new URLSearchParams({
    client_id: clienteId,
    redirect_uri: retorno,
    response_type: 'code',
    scope: ESCOPO,
    access_type: 'offline',
    prompt: 'consent',
    state: estado,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${qs}`;
}

async function pedirToken(corpo) {
  const r = await buscar(TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(corpo) }, 'Google');
  return r.json();
}

/** Troca o código da autorização pelo token de longa duração. */
export async function trocarCodigo({ clienteId, segredo, retorno, codigo }) {
  const t = await pedirToken({ client_id: clienteId, client_secret: segredo, redirect_uri: retorno, code: codigo, grant_type: 'authorization_code' });
  if (!t.refresh_token) throw new Error('O Google não devolveu o token de longa duração');
  return t.refresh_token;
}

export async function tokenDeAcesso({ clienteId, segredo, tokenLongo }) {
  try {
    const t = await pedirToken({ client_id: clienteId, client_secret: segredo, refresh_token: tokenLongo, grant_type: 'refresh_token' });
    return t.access_token;
  } catch (e) {
    // O Google responde 400 quando a autorização foi revogada ou expirou
    if (/HTTP 400/.test(e.message)) throw new Error('Google: HTTP 401, autorização expirada. Conecte de novo em Integrações');
    throw e;
  }
}

/** Evento da API → linha espelho. Dia inteiro fica fixado na data civil de São Paulo. */
export function mapearEvento(e) {
  const inteiro = !!e.start?.date;
  const instante = (p) => (p?.date ? `${p.date}T00:00:00-03:00` : p?.dateTime ? new Date(p.dateTime).toISOString() : null);
  return {
    id_externo: `${AGENDA}|${e.id}`,
    titulo: cortar(e.summary, 300) ?? '(sem título)',
    descricao: cortar(e.description, 4000),
    inicio: instante(e.start),
    fim: instante(e.end),
    dia_inteiro: inteiro,
    local: cortar(e.location, 300),
    calendario_externo_id: AGENDA,
    ical_uid: e.iCalUID ?? null,
    atualizado_em_origem: e.updated ?? null,
    cancelado_em: null,
  };
}

const autorizacao = (acesso) => ({ Authorization: `Bearer ${acesso}`, 'Content-Type': 'application/json' });

/** Lê a agenda na janela, com as recorrências já expandidas pelo Google. */
export async function listarEventos(acesso, { inicio, fim }) {
  const registros = [];
  let pagina;
  do {
    const qs = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime', maxResults: '2500', timeMin: `${inicio}T00:00:00-03:00`, timeMax: `${fim}T00:00:00-03:00` });
    if (pagina) qs.set('pageToken', pagina);
    const r = await buscar(`${API}/calendars/${AGENDA}/events?${qs}`, { headers: autorizacao(acesso) }, 'Google Agenda').then((x) => x.json());
    for (const e of r.items ?? []) if (e.status !== 'cancelled') registros.push(mapearEvento(e));
    pagina = r.nextPageToken;
  } while (pagina);
  return registros;
}

/**
 * Dados do formulário → corpo da API. Horários sempre no fuso de São Paulo. Campo undefined fica
 * de fora e não é alterado. Os null limpam o formato anterior ao trocar entre dia inteiro e horário.
 */
export function corpoDoEvento({ titulo, local, descricao, data, dataFim, inicio, fim, diaInteiro }) {
  const base = { summary: titulo, location: local, description: descricao };
  const ultimo = dataFim ?? data;
  if (diaInteiro) {
    // No Google, o fim de dia inteiro é exclusivo
    return { ...base, start: { date: data, dateTime: null, timeZone: null }, end: { date: somarDias(ultimo, 1), dateTime: null, timeZone: null } };
  }
  return { ...base, start: { dateTime: `${data}T${inicio}:00`, timeZone: FUSO, date: null }, end: { dateTime: `${ultimo}T${fim}:00`, timeZone: FUSO, date: null } };
}

const idGoogle = (idExterno) => idExterno.slice(AGENDA.length + 1);

export async function criarEvento(acesso, dados) {
  const r = await buscar(`${API}/calendars/${AGENDA}/events`, { method: 'POST', headers: autorizacao(acesso), body: JSON.stringify(corpoDoEvento(dados)) }, 'Google Agenda');
  return mapearEvento(await r.json());
}

/** Altera só esta ocorrência, mesmo em evento recorrente. */
export async function alterarEvento(acesso, idExterno, dados) {
  const r = await buscar(`${API}/calendars/${AGENDA}/events/${encodeURIComponent(idGoogle(idExterno))}`, { method: 'PATCH', headers: autorizacao(acesso), body: JSON.stringify(corpoDoEvento(dados)) }, 'Google Agenda');
  return mapearEvento(await r.json());
}

/** Exclui só esta ocorrência, mesmo em evento recorrente. */
export async function excluirEvento(acesso, idExterno) {
  await buscar(`${API}/calendars/${AGENDA}/events/${encodeURIComponent(idGoogle(idExterno))}`, { method: 'DELETE', headers: autorizacao(acesso) }, 'Google Agenda');
}
