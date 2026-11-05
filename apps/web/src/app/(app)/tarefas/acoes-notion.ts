"use server";
import { criarDemandaNotion } from "@cc/integrations/src/escrita.js";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { demandaNotionSchema, mensagemDoBanco, validar, type EstadoFormulario } from "@/lib/validacao";

/** Cria uma demanda no Notion. Grava primeiro lá, e a cópia chega na sincronização seguinte. */
export async function criarDemanda(_: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  const { dados, erros } = validar(demandaNotionSchema, fd);
  if (!dados) return { erros };

  const { NOTION_TOKEN } = process.env;
  if (!NOTION_TOKEN) return { erro: "Gravação no Notion ainda não configurada no servidor." };
  const { data: conector } = await supabase.from("conectores").select("modo, escrita_autorizada_em").eq("ferramenta", "notion").maybeSingle();
  if (conector?.modo !== "leitura_escrita" || !conector.escrita_autorizada_em) return { erro: "Gravação no Notion não autorizada." };

  const { data: operacao, error } = await supabase
    .from("operacoes_externas")
    .insert({ ferramenta: "notion", operacao: "criar", entidade: "demandas_notion", registro_id: crypto.randomUUID(), id_externo: "novo", detalhe: dados.titulo.slice(0, 200) })
    .select("id")
    .single();
  if (error) return { erro: mensagemDoBanco(error) };

  try {
    const nova = await criarDemandaNotion(NOTION_TOKEN, dados);
    await supabase.from("operacoes_externas").update({ status: "sucesso", id_externo: nova.id, executado_em: new Date().toISOString() }).eq("id", operacao.id);
  } catch (e) {
    const erro = e instanceof Error ? e.message : "Falha no Notion";
    await supabase.from("operacoes_externas").update({ status: "erro", erro: erro.slice(0, 500), executado_em: new Date().toISOString() }).eq("id", operacao.id);
    return { erro: `Não criada: ${erro}` };
  }
  return { ok: true, mensagem: "Demanda criada no Notion. Ela aparece aqui na próxima sincronização." };
}
