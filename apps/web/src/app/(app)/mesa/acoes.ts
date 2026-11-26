"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { espelharNoTrello } from "@/lib/espelho-trello";
import { hojeSP, somarDias } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { UUID } from "@/lib/obras";

const texto = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function decidirItem(id: string, fd: FormData) {
  if (!UUID.test(id)) return;
  const { supabase } = await exigirSessaoCompleta();
  const decisao = texto(fd, "decisao");
  if (!decisao) redirect(`/?item=${id}&erro=decisao`);
  await supabase.from("decisoes").update({ decisao, status: "tomada", data_decisao: hojeSP() }).eq("id", id);
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
  const { data: t } = await supabase.from("tarefas").insert({ titulo: d.problema, obra_id: d.obra_id, responsavel_id: responsavel, prazo, fonte: "manual", tipo: "acao" }).select("id").single();
  if (t) await espelharNoTrello(supabase, [t.id]);
  // sai de DECIDIR até o prazo (ou 7 dias); se a tarefa atrasar, aparece em COBRAR
  await supabase.from("decisoes").update({ responsavel_id: responsavel, prazo, tarefa_id: t?.id ?? null, adiar_ate: prazo ?? somarDias(hojeSP(), 7) }).eq("id", id);
  revalidatePath("/");
  redirect("/");
}

export async function adiarItem(id: string, fd: FormData) {
  if (!UUID.test(id)) return;
  const { supabase } = await exigirSessaoCompleta();
  const ate = texto(fd, "adiar_ate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ate)) redirect(`/?item=${id}&erro=adiar`);
  await supabase.from("decisoes").update({ adiar_ate: ate }).eq("id", id);
  revalidatePath("/");
  redirect("/");
}
