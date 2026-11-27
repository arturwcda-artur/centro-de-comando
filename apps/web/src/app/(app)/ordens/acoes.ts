"use server";
import { revalidatePath } from "next/cache";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";

/** "Conferido": o gestor viu o resultado da ordem concluída; ela sai da cobrança (RN-49t). */
export async function conferirOrdem(id: string) {
  if (!UUID.test(id)) return;
  const { supabase } = await exigirSessaoCompleta();
  await supabase.from("tarefas").update({ ordem_conferida_em: new Date().toISOString() }).eq("id", id).not("ordem_tipo", "is", null).not("concluida_em", "is", null);
  revalidatePath("/ordens");
  revalidatePath("/");
}
