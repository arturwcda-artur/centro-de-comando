import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cartao } from "@/components/ui";
import { carregarOpcoes, UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { salvarProblema } from "../../acoes";
import { FormularioProblema } from "../../formularios";

export const metadata: Metadata = { title: "Editar problema" };

export default async function PaginaEditarProblema({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await exigirSessaoCompleta();
  const [{ data: p }, opcoes, obras] = await Promise.all([
    supabase.from("problemas").select("*").eq("id", id).maybeSingle(),
    carregarOpcoes(supabase),
    supabase.from("obras").select("id, codigo, nome").is("arquivado_em", null).order("codigo"),
  ]);
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href={`/problemas/${id}`} className="text-sm text-suave hover:text-texto">
          ← {p.titulo}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Editar problema</h1>
      </div>
      <Cartao>
        <FormularioProblema acao={salvarProblema.bind(null, id)} problema={p} obras={(obras.data ?? []).map((o) => ({ valor: o.id, rotulo: `${o.codigo} — ${o.nome}` }))} pessoas={opcoes.pessoas} />
      </Cartao>
    </div>
  );
}
