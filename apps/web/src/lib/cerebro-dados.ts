import "server-only";
import { calcularImpacto, TIPOS_MUDANCA, type Mudanca, type TipoMudanca } from "@/lib/cerebro";
import { hojeSP } from "@/lib/formato";
import type { criarClienteServidor } from "@/lib/supabase/servidor";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

/** Tudo o que o cérebro precisa para avaliar uma decisão: decisão, cronograma vigente, ligações e prazo (RN-49n). */
export async function carregarAvaliacao(supabase: Cliente, decisaoId: string) {
  const { data: decisao } = await supabase
    .from("decisoes")
    .select("id, obra_id, tarefa_id, tarefa_planejamento_id, problema, decisao, data_decisao, afeta_planejamento, obras(codigo, nome)")
    .eq("id", decisaoId)
    .maybeSingle();
  if (!decisao) return null;
  const obraId = decisao.obra_id;
  const [versaoR, avaliacaoR, contratosR, marcosR] = await Promise.all([
    obraId ? supabase.from("cronograma_versoes").select("id, nome").eq("obra_id", obraId).eq("tipo", "vigente").maybeSingle() : null,
    supabase.from("avaliacoes_planejamento").select("*").eq("decisao_id", decisaoId).maybeSingle(),
    obraId ? supabase.from("v_contratos_resumo").select("data_termino_vigente").eq("obra_id", obraId) : null,
    obraId ? supabase.from("marcos").select("data_contratual").eq("obra_id", obraId).eq("contratual", true) : null,
  ]);
  const versao = versaoR?.data ?? null;
  const [atividadesR, ligacoesR] = versao
    ? await Promise.all([
        supabase
          .from("atividades_cronograma")
          .select("id, edt, nome, resumo, marco, critica, inicio_previsto, fim_previsto, duracao_dias, percentual")
          .eq("versao_id", versao.id)
          .order("uid_project")
          .limit(5000),
        supabase
          .from("dependencias")
          .select("atividade_id, predecessora_id, tipo, defasagem_dias, atividades_cronograma!dependencias_atividade_id_fkey!inner(versao_id)")
          .eq("atividades_cronograma.versao_id", versao.id)
          .limit(10000),
      ])
    : [null, null];
  // O prazo que vale é o mais apertado entre o término vigente dos contratos e os marcos contratuais
  const prazos = [...(contratosR?.data ?? []).map((c) => c.data_termino_vigente), ...(marcosR?.data ?? []).map((m) => m.data_contratual)].filter((d): d is string => !!d).sort();
  return {
    decisao,
    versao,
    avaliacao: avaliacaoR.data,
    atividades: (atividadesR?.data ?? []).map((a) => ({ ...a, duracao_dias: a.duracao_dias === null ? null : Number(a.duracao_dias), percentual: Number(a.percentual) })),
    ligacoes: (ligacoesR?.data ?? []).map((l) => ({ atividade_id: l.atividade_id, predecessora_id: l.predecessora_id, tipo: l.tipo, defasagem_dias: Number(l.defasagem_dias) })),
    prazoContratual: prazos[0] ?? null,
  };
}

/** Lê a mudança escolhida na tela (parâmetros ou formulário). */
export function mudancaDe(valores: { atividade?: unknown; tipo?: unknown; dias?: unknown }): Mudanca | null {
  const tipo = TIPOS_MUDANCA.find((t) => t.valor === valores.tipo)?.valor as TipoMudanca | undefined;
  const dias = Number(valores.dias);
  if (typeof valores.atividade !== "string" || !valores.atividade || !tipo || !Number.isFinite(dias) || dias < 0 || dias > 2000) return null;
  return { atividadeId: valores.atividade, tipo, dias };
}

export function calcular(dados: NonNullable<Awaited<ReturnType<typeof carregarAvaliacao>>>, mudanca: Mudanca | null) {
  if (!mudanca || !dados.versao) return null;
  return calcularImpacto(dados.atividades, dados.ligacoes, mudanca, { prazoContratual: dados.prazoContratual, hoje: hojeSP(), cronograma: dados.versao.nome });
}
