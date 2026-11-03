import "server-only";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { decidirRedirecionamento, type NivelAal } from "@/lib/rotas";

/**
 * Camada de acesso (DAL): confirma no servidor que há sessão com segundo fator antes de renderizar.
 * Não confia apenas no proxy — e o banco também exige aal2 (RLS).
 */
export async function exigirSessaoCompleta() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = user
    ? await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    : { data: null };

  const destino = decidirRedirecionamento("/", {
    logado: !!user,
    aalAtual: (data?.currentLevel as NivelAal) ?? null,
    aalProximo: (data?.nextLevel as NivelAal) ?? null,
  });
  if (destino || !user) redirect(destino ?? "/login");

  return { supabase, usuario: { id: user.id, email: user.email ?? "" } };
}
