import "server-only";
import { hojeSP, somarDias } from "@/lib/formato";
import { avaliarProntidao, OBRAS_PILOTO, pendencias, type DadosProntidao, type ItemProntidao } from "@/lib/prontidao";
import type { criarClienteServidor } from "@/lib/supabase/servidor";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

/** ART no nome do arquivo, sem pegar "parte", "arte" etc. */
const PADRAO_ART = "(^|[^a-z])art([^a-z]|$)";

/** Lê o que a ficha confere para uma obra e devolve os itens avaliados. */
export async function carregarProntidao(supabase: Cliente, obraId: string): Promise<ItemProntidao[] | null> {
  const dados = await carregarDadosProntidao(supabase, obraId);
  return dados ? avaliarProntidao(dados) : null;
}

/** Os dados brutos da ficha de uma obra (a Sala de Situação usa as datas). */
export async function carregarDadosProntidao(supabase: Cliente, obraId: string): Promise<DadosProntidao | null> {
  const hoje = hojeSP();
  const [obra, contratos, arquivos, versao, diario, equipe, art, revisar, problemas] = await Promise.all([
    supabase.from("obras").select("situacao").eq("id", obraId).maybeSingle(),
    supabase.from("contratos").select("id, numero, data_termino_original, aditivos(numero, situacao, tipo, dias_delta, criado_em), medicoes(numero, periodo_fim, situacao, data_envio)").eq("obra_id", obraId).is("arquivado_em", null),
    supabase.from("cronograma_arquivos").select("papel, ultimo_erro").eq("obra_id", obraId),
    supabase.from("cronograma_versoes").select("id, atualizado_em_origem").eq("obra_id", obraId).eq("tipo", "vigente").order("importado_em", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("documentos").select("data_documento").eq("obra_id", obraId).eq("categoria", "diario_obra").is("arquivado_em", null).not("data_documento", "is", null).order("data_documento", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("documentos").select("id", { count: "exact", head: true }).eq("obra_id", obraId).eq("categoria", "equipe_efetivo").is("arquivado_em", null),
    supabase.from("documentos").select("id", { count: "exact", head: true }).eq("obra_id", obraId).filter("titulo", "imatch", PADRAO_ART).is("arquivado_em", null),
    supabase.from("documentos").select("id", { count: "exact", head: true }).eq("obra_id", obraId).eq("categoria", "revisar").is("arquivado_em", null),
    supabase.from("problemas").select("id", { count: "exact", head: true }).eq("obra_id", obraId).in("status", ["aberto", "em_andamento"]).gte("gut", 64),
  ]);
  if (!obra.data) return null;

  let vigente: DadosProntidao["vigente"] = null;
  if (versao.data) {
    const { data: atividades } = await supabase.from("atividades_cronograma").select("fim_previsto, percentual, resumo, critica").eq("versao_id", versao.data.id).range(0, 4999);
    const lista = atividades ?? [];
    const abertasVencidas = lista.filter((a) => !a.resumo && a.fim_previsto && a.fim_previsto.slice(0, 10) < hoje && (a.percentual ?? 0) < 100);
    const termino = lista.reduce<string | null>((m, a) => (a.fim_previsto && (!m || a.fim_previsto > m) ? a.fim_previsto : m), null);
    vigente = { atualizado: versao.data.atualizado_em_origem, termino: termino?.slice(0, 10) ?? null, atrasadas: abertasVencidas.length, atrasadasCriticas: abertasVencidas.filter((a) => a.critica).length };
  }

  // Contrato principal: o de término mais longe. Aditivos aprovados com prazo estendem o término.
  const lista = contratos.data ?? [];
  const principal = [...lista].sort((a, b) => (b.data_termino_original ?? "").localeCompare(a.data_termino_original ?? ""))[0];
  const diasAprovados = (principal?.aditivos ?? []).filter((a) => a.situacao === "aprovado").reduce((s, a) => s + (a.dias_delta ?? 0), 0);
  const dados: DadosProntidao = {
    hoje,
    situacaoObra: obra.data.situacao,
    contrato: principal ? { numero: principal.numero, termino: principal.data_termino_original ? somarDias(principal.data_termino_original, diasAprovados) : null } : null,
    aditivos: lista.flatMap((c) => c.aditivos.map((a) => ({ numero: a.numero, situacao: a.situacao, tipo: a.tipo, desde: a.criado_em }))),
    arquivos: (arquivos.data ?? []).map((a) => ({ papel: a.papel, erro: !!a.ultimo_erro })),
    vigente,
    medicoes: lista.flatMap((c) => c.medicoes.map((m) => ({ numero: m.numero != null ? String(m.numero) : null, periodoFim: m.periodo_fim, situacao: m.situacao, dataEnvio: m.data_envio }))),
    documentos: { ultimoDiario: diario.data?.data_documento ?? null, equipe: equipe.count ?? 0, art: art.count ?? 0, revisar: revisar.count ?? 0 },
    problemasCriticos: problemas.count ?? 0,
  };
  return dados;
}

/** Itens que os Alertas da Mesa já mostram (RN-83): ficam na ficha, mas não se repetem na Mesa. */
const JA_NOS_ALERTAS = new Set(["prazo-contratual", "problemas"]);

/** Pendências das obras piloto para a Mesa (Doutrina: cada falta vira item). */
export async function pendenciasDasObrasPiloto(supabase: Cliente) {
  const { data: obras } = await supabase.from("obras").select("id, codigo").in("codigo", OBRAS_PILOTO).is("arquivado_em", null);
  const porObra = await Promise.all(
    (obras ?? []).map(async (o) => ((await carregarProntidao(supabase, o.id)) ?? []).filter((i) => !JA_NOS_ALERTAS.has(i.chave)).map((i) => ({ ...i, obraId: o.id }))),
  );
  return pendencias(porObra.flat()) as (ItemProntidao & { obraId: string })[];
}
