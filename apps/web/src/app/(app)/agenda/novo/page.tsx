import type { Metadata } from "next";
import Link from "next/link";
import { Cartao } from "@/components/ui";
import { hojeSP } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { salvarCompromisso } from "../acoes";
import { FormularioCompromisso } from "../formulario-compromisso";

export const metadata: Metadata = { title: "Novo compromisso" };

export default async function PaginaNovoCompromisso() {
  const { supabase } = await exigirSessaoCompleta();
  const { data: obras } = await supabase.from("obras").select("id, codigo, nome").is("arquivado_em", null).order("codigo");
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/agenda" className="text-sm text-suave hover:text-texto">
          ← Agenda
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Novo compromisso</h1>
      </div>
      <Cartao>
        <FormularioCompromisso
          acao={salvarCompromisso.bind(null, null)}
          compromisso={{ data: hojeSP() }}
          obras={(obras ?? []).map((o) => ({ valor: o.id, rotulo: `${o.codigo} — ${o.nome}` }))}
          rotuloBotao="Criar no Google Agenda"
        />
      </Cartao>
    </div>
  );
}
