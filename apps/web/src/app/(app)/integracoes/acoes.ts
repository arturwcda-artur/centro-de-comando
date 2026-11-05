"use server";
import { revalidatePath } from "next/cache";
import { PAUSA_SEM_PRAZO } from "@/lib/integracoes";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { mensagemDoBanco, type EstadoFormulario } from "@/lib/validacao";

const REPOSITORIO = "arturwcda-artur/centro-de-comando";

/** Dispara a sincronização no GitHub Actions. O token só tem permissão de disparar a rotina. */
export async function sincronizarAgora(_: EstadoFormulario): Promise<EstadoFormulario> {
  await exigirSessaoCompleta();
  const token = process.env.GITHUB_SINCRONIZAR_TOKEN;
  if (!token) return { erro: "Sincronização direta ainda não configurada." };
  const r = await fetch(`https://api.github.com/repos/${REPOSITORIO}/actions/workflows/sincronizar.yml/dispatches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    body: JSON.stringify({ ref: "main" }),
  });
  if (!r.ok) return { erro: `O GitHub recusou o pedido (HTTP ${r.status}).` };
  return { ok: true, mensagem: "Sincronização iniciada. Em cerca de 1 minuto, recarregue a página." };
}

/** Pausa ou retoma a leitura. A gravação feita pelas telas não é afetada. */
export async function alternarPausa(ferramenta: string, pausado: boolean) {
  const { supabase } = await exigirSessaoCompleta();
  const { error } = await supabase
    .from("conectores")
    .update({ pausado_ate: pausado ? null : PAUSA_SEM_PRAZO })
    .eq("ferramenta", ferramenta);
  if (error) throw new Error(mensagemDoBanco(error));
  revalidatePath("/integracoes");
  revalidatePath("/");
}
