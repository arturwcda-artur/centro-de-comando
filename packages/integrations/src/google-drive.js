/**
 * Liga os documentos indexados aos arquivos do Google Drive (ADR 0018).
 * Só lê dados dos arquivos, com o escopo drive.metadata.readonly. Nunca lê conteúdo nem grava no Drive.
 */
import { buscar } from './util.js';

const API = 'https://www.googleapis.com/drive/v3/files';
const PASTA = 'application/vnd.google-apps.folder';
const PAIS_POR_CONSULTA = 20;
const LOTE = 200;

const normalizar = (t) => t.normalize('NFC');
const aspas = (t) => t.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function listar(acesso, q, campos = 'id,name,mimeType,parents,webViewLink') {
  const arquivos = [];
  let pagina;
  do {
    const qs = new URLSearchParams({ q, pageSize: '1000', fields: `nextPageToken,files(${campos})` });
    if (pagina) qs.set('pageToken', pagina);
    const r = await buscar(`${API}?${qs}`, { headers: { Authorization: `Bearer ${acesso}` } }, 'Google Drive').then((x) => x.json());
    arquivos.push(...(r.files ?? []));
    pagina = r.nextPageToken;
  } while (pagina);
  return arquivos;
}

/** Percorre a pasta por níveis, com várias pastas por consulta. Devolve caminho relativo → arquivo. */
export async function arvoreDaPasta(acesso, idRaiz) {
  const mapa = new Map();
  let nivel = new Map([[idRaiz, '']]);
  while (nivel.size) {
    const proximo = new Map();
    const ids = [...nivel.keys()];
    for (let i = 0; i < ids.length; i += PAIS_POR_CONSULTA) {
      const pais = ids.slice(i, i + PAIS_POR_CONSULTA).map((id) => `'${id}' in parents`).join(' or ');
      for (const f of await listar(acesso, `(${pais}) and trashed = false`)) {
        const pai = f.parents?.find((p) => nivel.has(p));
        if (pai === undefined) continue;
        const relativo = normalizar(`${nivel.get(pai)}${f.name}`);
        if (f.mimeType === PASTA) proximo.set(f.id, `${relativo}/`);
        else mapa.set(relativo, { id: f.id, url: f.webViewLink });
      }
    }
    nivel = proximo;
  }
  return mapa;
}

/** Pode haver pastas de mesmo nome, uma por computador: vale a que tem mais caminhos do índice. */
export async function melhorArvore(acesso, nomePasta, relativos) {
  const candidatas = await listar(acesso, `name = '${aspas(nomePasta)}' and mimeType = '${PASTA}' and trashed = false`, 'id');
  let melhor = new Map();
  let acertos = -1;
  for (const c of candidatas) {
    const arvore = await arvoreDaPasta(acesso, c.id);
    const total = relativos.filter((r) => arvore.has(r)).length;
    if (total > acertos) {
      melhor = arvore;
      acertos = total;
    }
  }
  return melhor;
}

const relativoDe = (idExterno) => normalizar(idExterno.slice(idExterno.indexOf(':') + 1));

async function documentosDaPasta(supabase, idPasta) {
  const documentos = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from('documentos').select('id, id_externo').eq('fonte', 'pasta').is('arquivado_em', null).like('id_externo', `${idPasta}:%`).range(de, de + 999);
    if (error) throw new Error(`leitura de documentos: ${error.message}`);
    documentos.push(...data);
    if (data.length < 1000) return documentos;
  }
}

async function linksAtuais(supabase) {
  const links = new Map();
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from('documento_links').select('documento_id, drive_file_id, url').range(de, de + 999);
    if (error) throw new Error(`leitura de links: ${error.message}`);
    for (const l of data) links.set(l.documento_id, l);
    if (data.length < 1000) return links;
  }
}

/** Só grava o que mudou. Devolve quantos documentos têm link e quantos ficaram sem. */
export async function vincularDocumentos(supabase, acesso) {
  const { data: pastas, error } = await supabase.from('documento_pastas').select('id, caminho');
  if (error) throw new Error(`leitura de pastas: ${error.message}`);
  const atuais = await linksAtuais(supabase);
  const resultado = { lidos: 0, criados: 0, atualizados: 0, ignorados: 0, semLink: 0, itens: [] };

  for (const pasta of pastas) {
    const documentos = await documentosDaPasta(supabase, pasta.id);
    if (!documentos.length) continue;
    const nome = pasta.caminho.split(/[\\/]/).filter(Boolean).at(-1);
    const arvore = await melhorArvore(acesso, nome, documentos.map((d) => relativoDe(d.id_externo)));

    const novos = [];
    for (const d of documentos) {
      resultado.lidos += 1;
      const arquivo = arvore.get(relativoDe(d.id_externo));
      if (!arquivo) {
        resultado.semLink += 1;
        continue;
      }
      const atual = atuais.get(d.id);
      if (atual?.drive_file_id === arquivo.id && atual.url === arquivo.url) {
        resultado.ignorados += 1;
        continue;
      }
      atual ? (resultado.atualizados += 1) : (resultado.criados += 1);
      novos.push({ documento_id: d.id, drive_file_id: arquivo.id, url: arquivo.url });
    }
    for (let i = 0; i < novos.length; i += LOTE) {
      const { error: e } = await supabase.from('documento_links').upsert(novos.slice(i, i + LOTE), { onConflict: 'documento_id' });
      if (e) throw new Error(`gravação de links: ${e.message}`);
    }
  }
  return resultado;
}
