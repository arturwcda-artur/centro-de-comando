"use server";
import { redirect } from "next/navigation";
import { retornoPermitido } from "@/lib/mcp";
import { exigirSessaoCompleta } from "@/lib/sessao";

/** Confere o destino de novo no servidor antes de aprovar: a tela não é garantia. */
export async function decidirAutorizacao(id: string, aprovar: boolean) {
  const { supabase } = await exigirSessaoCompleta();
  const { data: pedido } = await supabase.auth.oauth.getAuthorizationDetails(id);
  if (!pedido || !("authorization_id" in pedido) || !retornoPermitido(pedido.redirect_uri)) throw new Error("Pedido de autorização inválido.");

  const { data, error } = aprovar ? await supabase.auth.oauth.approveAuthorization(id, { skipBrowserRedirect: true }) : await supabase.auth.oauth.denyAuthorization(id, { skipBrowserRedirect: true });
  if (error || !data) throw new Error("Não foi possível concluir a autorização.");
  redirect(data.redirect_url);
}

export async function revogarAssistente(clienteId: string) {
  const { supabase } = await exigirSessaoCompleta();
  const { error } = await supabase.auth.oauth.revokeGrant({ clientId: clienteId });
  if (error) throw new Error("Não foi possível revogar.");
  redirect("/integracoes");
}
