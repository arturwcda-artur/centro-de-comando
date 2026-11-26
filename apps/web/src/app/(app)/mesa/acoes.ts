"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { espelharNoTrello } from "@/lib/espelho-trello";
import { hojeSP, somarDias } from "@/lib/formato";
import { resultadoDecidido, resultadoNaoSeAplica } from "@/lib/mesa-acoes";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { UUID } from "@/lib/obras";
import { decididoSchema, mensagemDoBanco, naoSeAplicaSchema, validar, type EstadoFormulario } from "@/lib/validacao";

const texto = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** "Decidido": grava a decisão com quem decidiu e quando (pode ter sido fora da Mesa). */
export async function decidirItem(id: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  if (!UUID.test(id)) return { erro: "Item inválido." };
  const { supabase } = await exigirSessaoCompleta();
  const { dados, erros } = validar(decididoSchema, fd);
  if (!dados) return { erros };
  let nome: string | null = null;
  if (dados.quem !== "eu") {
    const { data: pessoa } = await supabase.from("pessoas").select("nome").eq("id", dados.quem).is("arquivado_em", null).maybeSingle();
    if (!pessoa) return { erros: { quem: "Pessoa não encontrada." } };
    nome = pessoa.nome;
  }
  const { data: atual } = await supabase.from("decisoes").select("status").eq("id", id).maybeSingle();
  if (atual?.status !== "pendente") return { erro: "Este item já foi tratado." };
  const { error } = await supabase
    .from("decisoes")
    .update({ decisao: dados.decisao, status: "tomada", data_decisao: dados.quando, afeta_planejamento: dados.afeta_planejamento, resultado: resultadoDecidido(nome) })
    .eq("id", id);
  if (error) return { erro: mensagemDoBanco(error) };
  revalidatePath("/");
  // Gerar ação: abre o Delegar logo em seguida, com a decisão já tomada
  redirect(dados.gerar_acao ? `/?item=${id}&delegar=1` : "/");
}

/** "Não se aplica mais": o item sai da Mesa, com o motivo registrado. */
export async function naoSeAplicaItem(id: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  if (!UUID.test(id)) return { erro: "Item inválido." };
  const { supabase } = await exigirSessaoCompleta();
  const { dados, erros } = validar(naoSeAplicaSchema, fd);
  if (!dados) return { erros };
  const { data: atual } = await supabase.from("decisoes").select("status").eq("id", id).maybeSingle();
  if (atual?.status !== "pendente") return { erro: "Este item já foi tratado." };
  const { error } = await supabase.from("decisoes").update({ status: "cancelada", resultado: resultadoNaoSeAplica(dados.motivo) }).eq("id", id);
  if (error) return { erro: mensagemDoBanco(error) };
  revalidatePath("/");
  redirect("/");
}

export async function delegarItem(id: string, fd: FormData) {
  if (!UUID.test(id)) return;
  const { supabase } = await exigirSessaoCompleta();
  const responsavel = texto(fd, "responsavel_id");
  const prazo = texto(fd, "prazo") || null;
  const { data: d } = await supabase.from("decisoes").select("problema, obra_id").eq("id", id).single();
  if (!d || !UUID.test(responsavel)) redirect(`/?item=${id}&erro=delegar`);
  const { data: t, error: erroTarefa } = await supabase.from("tarefas").insert({ titulo: d.problema, obra_id: d.obra_id, responsavel_id: responsavel, prazo, fonte: "manual", tipo: "acao" }).select("id").single();
  if (erroTarefa || !t) redirect(`/?item=${id}&erro=delegar`);
  await espelharNoTrello(supabase, [t.id]);
  // sai de DECIDIR até o prazo (ou 7 dias); se a tarefa atrasar, aparece em COBRAR
  const { error } = await supabase.from("decisoes").update({ responsavel_id: responsavel, prazo, tarefa_id: t.id, adiar_ate: prazo ?? somarDias(hojeSP(), 7) }).eq("id", id);
  if (error) redirect(`/?item=${id}&erro=gravar`);
  revalidatePath("/");
  redirect("/");
}

export async function adiarItem(id: string, fd: FormData) {
  if (!UUID.test(id)) return;
  const { supabase } = await exigirSessaoCompleta();
  const ate = texto(fd, "adiar_ate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ate)) redirect(`/?item=${id}&erro=adiar`);
  const { error } = await supabase.from("decisoes").update({ adiar_ate: ate }).eq("id", id);
  if (error) redirect(`/?item=${id}&erro=gravar`);
  revalidatePath("/");
  redirect("/");
}
