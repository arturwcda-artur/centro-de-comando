import type { Metadata } from "next";
import Link from "next/link";
import { Cartao } from "@/components/ui";
import { carregarOpcoes } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { salvarProblema } from "../acoes";
import { FormularioProblema } from "../formularios";

export const metadata: Metadata = { title: "Novo problema" };

export default async function PaginaNovoProblema() {
  const { supabase } = await exigirSessaoCompleta();
  const [opcoes, obras] = await Promise.all([carregarOpcoes(supabase), supabase.from("obras").select("id, codigo, nome").is("arquivado_em", null).order("codigo")]);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/problemas" className="text-sm text-suave hover:text-texto">
          ← Problemas
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Novo problema</h1>
      </div>
      <Cartao>
        <FormularioProblema acao={salvarProblema.bind(null, null)} obras={(obras.data ?? []).map((o) => ({ valor: o.id, rotulo: `${o.codigo} — ${o.nome}` }))} pessoas={opcoes.pessoas} />
      </Cartao>
    </div>
  );
}
