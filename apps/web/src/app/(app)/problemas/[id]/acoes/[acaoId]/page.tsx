import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cartao } from "@/components/ui";
import { carregarOpcoes, UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { salvarAcao5w2h } from "../../../acoes";
import { FormularioAcao5w2h } from "../../../formularios";

export const metadata: Metadata = { title: "Editar ação 5W2H" };

export default async function PaginaEditarAcao({ params }: { params: Promise<{ id: string; acaoId: string }> }) {
  const { id, acaoId } = await params;
  if (!UUID.test(id) || !UUID.test(acaoId)) notFound();
  const { supabase } = await exigirSessaoCompleta();
  const [{ data: a }, opcoes] = await Promise.all([
    supabase.from("tarefas").select("titulo, prazo, responsavel_id, problemas(titulo), acoes_detalhes(*)").eq("id", acaoId).eq("problema_id", id).maybeSingle(),
    carregarOpcoes(supabase),
  ]);
  if (!a) notFound();
  const d = a.acoes_detalhes;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href={`/problemas/${id}`} className="text-sm text-suave hover:text-texto">
          ← {a.problemas?.titulo}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Editar ação 5W2H</h1>
      </div>
      <Cartao>
        <FormularioAcao5w2h
          acao={salvarAcao5w2h.bind(null, id, acaoId)}
          valores={{ o_que: d?.o_que ?? a.titulo, por_que: d?.por_que, onde: d?.onde, prazo: a.prazo, responsavel_id: a.responsavel_id, quem: d?.quem, como: d?.como, quanto: d?.quanto }}
          pessoas={opcoes.pessoas}
          botao="Salvar ação"
        />
      </Cartao>
    </div>
  );
}
