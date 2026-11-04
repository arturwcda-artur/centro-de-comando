/**
 * Conector Notion — este código só LÊ (ADR 0012), embora o token tenha permissão de escrita
 * por decisão do proprietário, para uso futuro com autorização (RN-64).
 * A "Central de Gestão — Artur" entra como histórico (decisão D3): demandas → tarefas, reuniões → reuniões.
 * Só enxerga as páginas que o proprietário compartilhou com a conexão.
 * API 2025-09-03: as bases são lidas pelos seus data sources (/search e /data_sources/{id}/query).
 */
import { buscar, cortar, dataSP } from './util.js';

const API = 'https://api.notion.com/v1';
const VERSAO = '2025-09-03';

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

/**
 * Bases da Central de Gestão, consultadas diretamente: a busca do Notion nem sempre lista
 * bases internas de uma página compartilhada. Os ids não são segredo; sem acesso, o Notion responde 404.
 */
export const BASES_CENTRAL = [
  { id: 'eaa80b95-7806-4a12-810b-f18195743cc0', title: [{ plain_text: 'Demandas Ativas' }] },
  { id: '0d449df1-0031-4751-806f-4fb1dbbe396d', title: [{ plain_text: 'Histórico de Reuniões' }] },
];

/** Lê as bases da Central de Gestão mais as que a busca encontrar, sem repetir. */
export async function lerNotion(token) {
  const encontradas = await paginar('/search', token, { filter: { property: 'object', value: 'data_source' } });
  const bases = [...BASES_CENTRAL, ...encontradas.filter((b) => !BASES_CENTRAL.some((c) => c.id === b.id))];
  const tarefas = [];
  const reunioes = [];
  const lidas = [];
  for (const b of bases) {
    const titulo = textoDe(b.title) || 'Base sem título';
    const tipo = classificarBase(titulo);
    if (!tipo) continue;
    lidas.push(titulo);
    const paginas = (await paginar(`/data_sources/${b.id}/query`, token, {})).filter((p) => !p.archived && !p.in_trash);
    if (tipo === 'tarefas') tarefas.push(...paginas.map((p) => mapearDemanda(p, titulo)));
    else reunioes.push(...paginas.map(mapearReuniao));
  }
  return { tarefas, reunioes, bases: lidas, visiveis: bases.length };
}
