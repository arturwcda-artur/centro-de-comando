/**
 * Conector Notion — SOMENTE LEITURA (integração interna com permissão só de leitura; ADR 0012).
 * A "Central de Gestão — Artur" entra como histórico (decisão D3): demandas → tarefas, reuniões → reuniões.
 * Só enxerga as páginas que o proprietário compartilhou com a integração.
 */
import { buscar, cortar, dataSP } from './util.js';

const API = 'https://api.notion.com/v1';
const VERSAO = '2022-06-28';

function cabecalhos(token) {
  return { Authorization: `Bearer ${token}`, 'Notion-Version': VERSAO, 'Content-Type': 'application/json' };
}

async function paginar(caminho, token, corpo) {
  const resultados = [];
  let cursor;
  do {
    const r = await buscar(`${API}${caminho}`, { method: 'POST', headers: cabecalhos(token), body: JSON.stringify({ ...corpo, start_cursor: cursor, page_size: 100 }) }, 'Notion');
    const json = await r.json();
    resultados.push(...json.results);
    cursor = json.has_more ? json.next_cursor : undefined;
  } while (cursor);
  return resultados;
}

const textoDe = (ricos) => (ricos ?? []).map((t) => t.plain_text).join('').trim();

function propriedade(pagina, tipos) {
  return Object.values(pagina.properties ?? {}).find((p) => tipos.includes(p.type));
}

export function tituloDe(pagina) {
  return textoDe(propriedade(pagina, ['title'])?.title) || '(sem título)';
}

function dataDe(pagina) {
  const p = propriedade(pagina, ['date']);
  return p?.date?.start ?? null;
}

function situacaoDe(pagina) {
  const p = Object.values(pagina.properties ?? {}).find((x) => x.type === 'status') ?? Object.entries(pagina.properties ?? {}).find(([nome, x]) => x.type === 'select' && /status|situa|etapa/i.test(nome))?.[1];
  return p?.status?.name ?? p?.select?.name ?? null;
}

export function classificarBase(titulo) {
  if (/reuni/i.test(titulo)) return 'reunioes';
  if (/demanda|tarefa|pend/i.test(titulo)) return 'tarefas';
  return null;
}

export function mapearDemanda(pagina, base) {
  const situacao = situacaoDe(pagina);
  const concluida = situacao ? /conclu|feito|finaliz|done|resolvid|encerr/i.test(situacao.normalize('NFD').replace(/[̀-ͯ]/g, '')) : false;
  const data = dataDe(pagina);
  return {
    id_externo: pagina.id,
    titulo: cortar(tituloDe(pagina), 300),
    descricao: cortar([situacao ? `Situação no Notion: ${situacao}` : null, pagina.url].filter(Boolean).join('\n'), 4000),
    prazo: data ? (data.length > 10 ? dataSP(data) : data) : null,
    status: concluida ? 'concluida' : 'a_fazer',
    concluida_em: concluida ? pagina.last_edited_time : null,
    categoria: cortar(`Notion › ${base}`, 100),
    responsavel_id: null,
    atualizado_em_origem: pagina.last_edited_time,
  };
}

export function mapearReuniao(pagina) {
  const data = dataDe(pagina) ?? pagina.created_time;
  return {
    id_externo: pagina.id,
    titulo: cortar(tituloDe(pagina), 300),
    data: data.length > 10 ? dataSP(data) : data,
    pauta: cortar(pagina.url, 4000),
    atualizado_em_origem: pagina.last_edited_time,
  };
}

/** Lê as bases compartilhadas com a integração e classifica por título. */
export async function lerNotion(token) {
  const bases = await paginar('/search', token, { filter: { property: 'object', value: 'database' } });
  const tarefas = [];
  const reunioes = [];
  const lidas = [];
  for (const b of bases) {
    const titulo = textoDe(b.title) || 'Base sem título';
    const tipo = classificarBase(titulo);
    if (!tipo) continue;
    lidas.push(titulo);
    const paginas = (await paginar(`/databases/${b.id}/query`, token, {})).filter((p) => !p.archived && !p.in_trash);
    if (tipo === 'tarefas') tarefas.push(...paginas.map((p) => mapearDemanda(p, titulo)));
    else reunioes.push(...paginas.map(mapearReuniao));
  }
  return { tarefas, reunioes, bases: lidas };
}
