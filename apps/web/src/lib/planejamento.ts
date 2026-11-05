import "server-only";
import type { SerieCurva } from "@/components/grafico-curva-s";
import { valorAnterior } from "@/lib/contratos";
import { diferencaEmDias, serieSemanal, terminoPrevisto, type PontoCurva } from "@/lib/curva-s";
import { brl, hojeSP } from "@/lib/formato";
import type { criarClienteServidor } from "@/lib/supabase/servidor";

const DIAS_LEITURA_ANTIGA = 7;

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

/** Dados de planejamento de uma obra. A tela e o relatório usam esta mesma função, para os números não divergirem. */
export async function carregarPlanejamentoObra(supabase: Cliente, id: string) {
  const [obraR, arquivosR, versoesR, realizadoR, marcosR, contratosR, medicoesR] = await Promise.all([
    supabase.from("obras").select("id, codigo, nome").eq("id", id).maybeSingle(),
    supabase.from("cronograma_arquivos").select("*").eq("obra_id", id).order("papel"),
    supabase.from("cronograma_versoes").select("id, nome, tipo, importado_em, arquivo_id").eq("obra_id", id).order("importado_em", { ascending: false }),
    supabase.from("cronograma_realizado").select("*").eq("obra_id", id).order("data_leitura"),
    supabase.from("marcos").select("nome, data_contratual").eq("obra_id", id).eq("contratual", true),
    supabase.from("v_contratos_resumo").select("valor_contratado").eq("obra_id", id),
    supabase.from("medicoes").select("situacao, periodo_fim, valor_medido, valor_glosado, contratos!inner(obra_id)").eq("contratos.obra_id", id),
  ]);
  const obra = obraR.data;
  if (!obra) return null;

  const arquivos = arquivosR.data ?? [];
  const versoes = versoesR.data ?? [];
  const arquivoVigente = arquivos.find((a) => a.papel === "vigente");
  const vigente = versoes.find((v) => v.tipo === "vigente");
  const linhaBase = versoes.find((v) => v.tipo === "linha_base");

  const colunas = "id, uid_project, edt, nome, nivel, resumo, marco, critica, inicio_previsto, fim_previsto, percentual, custo";
  const [atividadesVigente, atividadesBase] = await Promise.all([
    vigente ? supabase.from("atividades_cronograma").select(colunas).eq("versao_id", vigente.id).order("uid_project") : null,
    linhaBase ? supabase.from("atividades_cronograma").select(colunas).eq("versao_id", linhaBase.id).order("uid_project") : null,
  ]);
  const listaVigente = atividadesVigente?.data ?? [];
  const listaBase = atividadesBase?.data ?? [];

  const hoje = hojeSP();
  const inicio = listaVigente.map((a) => a.inicio_previsto).filter((d): d is string => !!d).sort()[0] ?? null;
  const partida = valorAnterior(medicoesR.data ?? [], inicio, { valor: arquivoVigente?.valor_executado_anterior ?? null, data: arquivoVigente?.data_executado_anterior ?? null });
  const anterior = partida.valor;
  const realizados = (realizadoR.data ?? []).filter((r) => r.arquivo_id === arquivoVigente?.id);
  const atual = realizados.find((r) => r.versao_id === vigente?.id);
  const totalVigente = atual?.total ?? 0;
  const executado = anterior + (atual?.realizado ?? 0);
  const avanco = totalVigente + anterior > 0 ? (executado / (totalVigente + anterior)) * 100 : null;

  const termino = terminoPrevisto(listaVigente);
  const terminoBase = terminoPrevisto(listaBase);
  const limite = (marcosR.data ?? []).find((m) => m.data_contratual)?.data_contratual ?? null;

  const pontosRealizado: PontoCurva[] = [
    ...(partida.data ? [{ data: partida.data, valor: anterior }] : []),
    ...realizados.map((r) => ({ data: r.data_leitura as string, valor: anterior + (r.realizado ?? 0) })),
  ];
  const series: SerieCurva[] = [
    { nome: "Linha de base", classe: "text-suave", pontos: serieSemanal(listaBase), tracejada: true },
    { nome: "Vigente", classe: "text-marca", pontos: serieSemanal(listaVigente, anterior) },
    { nome: "Realizado", classe: "text-ok", pontos: pontosRealizado, marcadores: true },
  ];

  const folhas = listaVigente.filter((a) => !a.resumo);
  const semCusto = folhas.filter((a) => !a.marco && !a.custo).length;
  const totalBase = listaBase.filter((a) => !a.resumo).reduce((s, a) => s + (a.custo ?? 0), 0);
  const totalContrato = (contratosR.data ?? []).reduce((s, c) => s + (c.valor_contratado ?? 0), 0);
  const antigos = arquivos.filter((a) => a.ultima_leitura_em && diferencaEmDias(a.ultima_leitura_em.slice(0, 10), hoje) > DIAS_LEITURA_ANTIGA);

  const avisos = [
    ...arquivos.filter((a) => a.ultimo_erro).map((a) => `${a.caminho.split("\\").at(-1)}: ${a.ultimo_erro}`),
    ...(vigente && partida.origem === "digitado" && !arquivoVigente?.valor_executado_anterior ? ["Informe o valor executado antes da retomada: sem ele, a curva vigente começa em zero."] : []),
    ...(semCusto > 0 ? [`${semCusto} atividades do cronograma vigente estão sem custo e não pesam na Curva S.`] : []),
    ...(versoes.some((v) => v.tipo === "reprogramacao") ? ["O arquivo da linha de base mudou. A linha de base só troca se você confirmar, em Versões."] : []),
    ...(totalContrato > 0 && Math.abs(totalContrato - (totalVigente + anterior)) > 1 ? [`Vigente mais executado soma ${brl(totalVigente + anterior)}, e o contrato, ${brl(totalContrato)}.`] : []),
    ...(totalBase > 0 && vigente && Math.abs(totalBase - (totalVigente + anterior)) > 1 ? [`A linha de base soma ${brl(totalBase)}, e o vigente mais o executado, ${brl(totalVigente + anterior)}.`] : []),
    ...(antigos.length > 0 ? [`${antigos.length} arquivos não são lidos há mais de ${DIAS_LEITURA_ANTIGA} dias.`] : []),
  ];

  return { obra, arquivos, versoes, arquivoVigente, vigente, listaVigente, inicio, partida, anterior, executado, avanco, termino, terminoBase, limite, series, avisos };
}
