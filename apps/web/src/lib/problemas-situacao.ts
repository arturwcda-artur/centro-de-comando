import "server-only";
import { situacaoPelasAcoes } from "@/lib/problemas";
import type { exigirSessaoCompleta } from "@/lib/sessao";

type Cliente = Awaited<ReturnType<typeof exigirSessaoCompleta>>["supabase"];

/** Recalcula a situação do problema a partir das ações (RN-49h). */
export async function atualizarSituacaoDoProblema(supabase: Cliente, problemaId: string) {
  const [{ data: p }, { data: acoes }] = await Promise.all([
    supabase.from("problemas").select("status, resolvido_em").eq("id", problemaId).maybeSingle(),
    supabase.from("tarefas").select("status").eq("problema_id", problemaId),
  ]);
  if (!p) return;
  const nova = situacaoPelasAcoes(p.status, acoes ?? []);
  if (nova === p.status) return;
  await supabase
    .from("problemas")
    .update({ status: nova, resolvido_em: nova === "resolvido" ? (p.resolvido_em ?? new Date().toISOString()) : null })
    .eq("id", problemaId);
}
