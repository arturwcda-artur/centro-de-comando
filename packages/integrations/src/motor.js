/**
 * Motor de sincronização (INTEGRATIONS.md §Princípios, RN-61 a RN-63):
 *  - upsert por (fonte, id_externo) → reimportar nunca duplica;
 *  - hash dos campos → nada é gravado se a origem não mudou;
 *  - cada execução fica registrada em sync_execucoes / sync_itens e no estado do conector.
 * Somente LÊ as ferramentas de origem; escreve apenas no banco do Centro de Comando.
 */
import { hashDe } from './util.js';

const LOTE = 200;

async function existentes(supabase, tabela, fonte) {
  const mapa = new Map();
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(tabela).select('id, id_externo, hash_conteudo').eq('fonte', fonte).range(de, de + 999);
    if (error) throw new Error(`leitura de ${tabela}: ${error.message}`);
    for (const r of data) mapa.set(r.id_externo, r);
    if (data.length < 1000) return mapa;
  }
}

/**
 * Grava os registros mapeados de uma fonte numa tabela espelho.
 * @returns {{lidos:number, criados:number, atualizados:number, ignorados:number, itens:{entidade:string,id_externo:string,acao:string}[]}}
 */
export async function aplicar(supabase, { tabela, fonte, registros, agora = new Date().toISOString() }) {
  const atuais = await existentes(supabase, tabela, fonte);
  // Lotes homogêneos: novos (com importado_em) e alterados (sem tocar em importado_em).
  // Em lote misto o PostgREST preencheria a coluna ausente com null.
  const novos = [];
  const alterados = [];
  const itens = [];
  let criados = 0;
  let atualizados = 0;
  for (const r of registros) {
    const hash = hashDe(r);
    const atual = atuais.get(r.id_externo);
    if (atual && atual.hash_conteudo === hash) continue;
    const acao = atual ? 'atualizado' : 'criado';
    acao === 'criado' ? criados++ : atualizados++;
    itens.push({ entidade: tabela, id_externo: r.id_externo, acao });
    const linha = { ...r, fonte, hash_conteudo: hash, status_sync: 'sincronizado' };
    if (atual) alterados.push(linha);
    else novos.push({ ...linha, importado_em: agora });
  }
  for (const lote of [novos, alterados]) {
    for (let i = 0; i < lote.length; i += LOTE) {
      const { error } = await supabase.from(tabela).upsert(lote.slice(i, i + LOTE), { onConflict: 'fonte,id_externo' });
      if (error) throw new Error(`gravação em ${tabela}: ${error.message}`);
    }
  }
  return { lidos: registros.length, criados, atualizados, ignorados: registros.length - criados - atualizados, itens };
}

/** Executa um conector registrando início, fim, contagens e erros (sem nunca registrar segredos). */
export async function executarConector(supabase, { ferramenta, nome, gatilho = 'agendado', intervaloMin = 60 }, fn) {
  const { data: conector, error: e1 } = await supabase
    .from('conectores')
    // Sem "modo": a autorização de escrita é do proprietário e a sincronização nunca a altera
    .upsert({ ferramenta, nome_exibicao: nome, ativo: true, intervalo_minutos: intervaloMin }, { onConflict: 'ferramenta' })
    .select('id')
    .single();
  if (e1) throw new Error(`registro do conector ${ferramenta}: ${e1.message}`);
  const { data: execucao } = await supabase.from('sync_execucoes').insert({ conector_id: conector.id, gatilho }).select('id').single();

  const fim = (dados) => supabase.from('sync_execucoes').update({ finalizado_em: new Date().toISOString(), ...dados }).eq('id', execucao.id);
  const proxima = new Date(Date.now() + intervaloMin * 60000).toISOString();
  try {
    const r = await fn();
    await fim({ status: 'sucesso', lidos: r.lidos, criados: r.criados, atualizados: r.atualizados, ignorados: r.ignorados, mensagem: r.mensagem ?? null });
    if (r.itens?.length) {
      await supabase.from('sync_itens').insert(r.itens.slice(0, 500).map((i) => ({ ...i, execucao_id: execucao.id })));
    }
    await supabase.from('conectores').update({ estado_conexao: 'conectado', ultima_sync_em: new Date().toISOString(), proxima_sync_em: proxima }).eq('id', conector.id);
    return { ok: true, ...r };
  } catch (erro) {
    const mensagem = String(erro?.message ?? erro).slice(0, 500);
    await fim({ status: 'erro', erros: 1, mensagem });
    const autenticacao = /HTTP 40[13]/.test(mensagem);
    await supabase.from('conectores').update({ estado_conexao: autenticacao ? 'erro_autenticacao' : 'erro', proxima_sync_em: proxima }).eq('id', conector.id);
    return { ok: false, mensagem };
  }
}

export function somar(...resultados) {
  return resultados.reduce(
    (t, r) => ({
      lidos: t.lidos + r.lidos,
      criados: t.criados + r.criados,
      atualizados: t.atualizados + r.atualizados,
      ignorados: t.ignorados + r.ignorados,
      itens: [...t.itens, ...r.itens],
    }),
    { lidos: 0, criados: 0, atualizados: 0, ignorados: 0, itens: [] },
  );
}
