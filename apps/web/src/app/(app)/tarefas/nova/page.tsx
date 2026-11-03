import type { Metadata } from "next";
import Link from "next/link";
import { Cartao } from "@/components/ui";
import { carregarOpcoes } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { salvarTarefa } from "../acoes";
import { FormularioTarefa } from "../formulario-tarefa";

export const metadata: Metadata = { title: "Nova tarefa" };

export default async function PaginaNovaTarefa({ searchParams }: PageProps<"/tarefas/nova">) {
  const obraInicial = (await searchParams).obra;
  const { supabase } = await exigirSessaoCompleta();
  const [opcoes, obras] = await Promise.all([carregarOpcoes(supabase), supabase.from("obras").select("id, codigo, nome").is("arquivado_em", null).order("codigo")]);
  const listaObras = (obras.data ?? []).map((o) => ({ valor: o.id, rotulo: `${o.codigo} — ${o.nome}` }));
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/tarefas" className="text-sm text-suave hover:text-texto">
          ← Tarefas
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Nova tarefa</h1>
      </div>
      <Cartao>
        <FormularioTarefa
          acao={salvarTarefa.bind(null, null)}
          tarefa={{ obra_id: typeof obraInicial === "string" ? obraInicial : null }}
          obras={listaObras}
          pessoas={opcoes.pessoas}
        />
      </Cartao>
    </div>
  );
}
