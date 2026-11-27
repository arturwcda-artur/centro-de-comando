"use server";
import { revalidatePath } from "next/cache";
import { GATILHOS_PADRAO, type ChaveGatilho } from "@/lib/gatilhos";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { mensagemDoBanco, type EstadoFormulario } from "@/lib/validacao";

/** Grava os gatilhos (RN-49u): cada um ligado ou desligado, com o seu limite. */
export async function salvarGatilhos(_: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  const erros: Record<string, string> = {};
  const linhas = (Object.keys(GATILHOS_PADRAO) as ChaveGatilho[]).map((chave) => {
    const limite = Number(fd.get(`limite_${chave}`));
    if (!Number.isInteger(limite) || limite < 0 || limite > 999) erros[`limite_${chave}`] = "Use um número inteiro de 0 a 999.";
    return { chave, ativo: fd.get(`ativo_${chave}`) === "on", limite };
  });
  if (Object.keys(erros).length) return { erros };
  for (const l of linhas) {
    const { error } = await supabase.from("gatilhos").update({ ativo: l.ativo, limite: l.limite }).eq("chave", l.chave);
    if (error) return { erro: mensagemDoBanco(error) };
  }
  revalidatePath("/gatilhos");
  revalidatePath("/");
  revalidatePath("/obras");
  revalidatePath("/ordens");
  return { ok: true, mensagem: "Gatilhos gravados." };
}
