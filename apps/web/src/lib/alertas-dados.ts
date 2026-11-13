import "server-only";
import { montarAlertas } from "@/lib/alertas";
import { terminoPrevisto } from "@/lib/curva-s";
import { cartoesParados } from "@/lib/equipe";
import { carregarCartoesEquipe } from "@/lib/equipe-dados";
import { hojeSP } from "@/lib/formato";
import { alertasConectores } from "@/lib/integracoes";
import type { criarClienteServidor } from "@/lib/supabase/servidor";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

/** Lê as fontes dos alertas. A consulta falhar vira erro, para a tela não dizer "tudo em dia" sem ter olhado. */
export async function carregarAlertas(supabase: Cliente) {
  const hoje = hojeSP();
  const [contratos, versoes, medicoes, vencimentos, tarefas, problemas, conectores, equipe] = await Promise.all([
    supabase.from("v_contratos_resumo").select("contrato_id, numero, obra_id, data_termino_vigente, saldo_a_medir"),
    supabase.from("cronograma_versoes").select("id, obra_id").eq("tipo", "vigente").order("importado_em", { ascending: false }),
    supabase.from("medicoes").select("contrato_id, periodo_fim").neq("situacao", "cancelada"),
    supabase.from("v_vencimentos").select("tipo, descricao, data").in("tipo", ["marco", "recebimento_previsto", "decisao"]),
    supabase.from("v_tarefas_priorizadas").select("id", { count: "exact", head: true }).eq("vencida", true),
    supabase.from("problemas").select("id", { count: "exact", head: true }).eq("status", "aberto").gte("gut", 64),
    supabase.from("conectores").select("nome_exibicao, ativo, estado_conexao, ultima_sync_em, intervalo_minutos, pausado_ate"),
    carregarCartoesEquipe(supabase),
  ]);
  const erro = [contratos, versoes, medicoes, vencimentos, tarefas, problemas, conectores].find((r) => r.error)?.error;
  if (erro) throw new Error(erro.message);

  // A versão mais recente de cada obra é a que vale
  const vigentes = new Map<string, string>();
  for (const v of versoes.data ?? []) if (!vigentes.has(v.obra_id)) vigentes.set(v.obra_id, v.id);
  const obras = new Set((contratos.data ?? []).map((c) => c.obra_id));
  const terminos: Record<string, string> = {};
  await Promise.all(
    [...vigentes].filter(([obra]) => obras.has(obra)).map(async ([obra, versao]) => {
      const { data, error } = await supabase.from("atividades_cronograma").select("fim_previsto, resumo, marco").eq("versao_id", versao);
      if (error) throw new Error(error.message);
      const termino = terminoPrevisto(data ?? []);
      if (termino) terminos[obra] = termino;
    }),
  );

  const ultimaMedicao: Record<string, string> = {};
  for (const m of medicoes.data ?? []) if (!ultimaMedicao[m.contrato_id] || m.periodo_fim > ultimaMedicao[m.contrato_id]) ultimaMedicao[m.contrato_id] = m.periodo_fim;

  return montarAlertas({
    hoje,
    contratos: contratos.data ?? [],
    terminos,
    ultimaMedicao,
    vencimentos: vencimentos.data ?? [],
    tarefasVencidas: tarefas.count ?? 0,
    cartoesParados: cartoesParados(equipe.cartoes, new Date()).length,
    problemasCriticosSemPlano: problemas.count ?? 0,
    integracoes: alertasConectores(conectores.data ?? [], new Date()),
  });
}
