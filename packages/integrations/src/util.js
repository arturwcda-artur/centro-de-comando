import { createHash } from 'node:crypto';

export const FUSO = 'America/Sao_Paulo';

/** Data civil (AAAA-MM-DD) em São Paulo de um instante ISO. */
export function dataSP(iso) {
  if (!iso) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date(iso));
}

export function hojeSP(agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(agora);
}

export function somarDias(iso, dias) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Hash estável dos campos sincronizados: detecta mudança real (RN-62). */
export function hashDe(obj) {
  const ordenado = Object.keys(obj)
    .sort()
    .reduce((acc, k) => ({ ...acc, [k]: obj[k] ?? null }), {});
  return createHash('sha256').update(JSON.stringify(ordenado)).digest('hex').slice(0, 32);
}

export function cortar(texto, max) {
  if (!texto) return null;
  const t = String(texto).trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t || null;
}

/** fetch com tempo-limite e erro legível (sem expor a URL, que pode conter segredo). */
export async function buscar(url, opcoes = {}, rotulo = 'requisição') {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), opcoes.timeoutMs ?? 30000);
  try {
    const r = await fetch(url, { ...opcoes, signal: controle.signal });
    if (!r.ok) throw new Error(`${rotulo}: HTTP ${r.status}`);
    return r;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`${rotulo}: tempo esgotado`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
