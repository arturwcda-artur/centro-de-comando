import type { Metadata } from "next";
import Link from "next/link";
import { Cartao } from "@/components/ui";
import { planilhaSugerida } from "@/lib/contratos";
import { carregarOpcoes } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { salvarContrato } from "../acoes";
import { FormularioContrato } from "../formulario-contrato";

export const metadata: Metadata = { title: "Novo contrato" };

export default async function PaginaNovoContrato() {
  const { supabase } = await exigirSessaoCompleta();
  const [opcoes, obras] = await Promise.all([carregarOpcoes(supabase), supabase.from("obras").select("id, codigo, nome, pasta_local").is("arquivado_em", null).order("codigo")]);
  const lista = obras.data ?? [];
  const sugestoes = Object.fromEntries(lista.flatMap((o) => {
    const caminho = planilhaSugerida(o.codigo, o.pasta_local);
    return caminho ? [[o.id, caminho]] : [];
  }));
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/contratos" className="text-sm text-suave hover:text-texto">
          ← Contratos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Novo contrato</h1>
      </div>
      <Cartao>
        <FormularioContrato acao={salvarContrato.bind(null, null)} obras={lista.map((o) => ({ valor: o.id, rotulo: `${o.codigo} — ${o.nome}` }))} contratantes={opcoes.contratantes} sugestoes={sugestoes} />
      </Cartao>
    </div>
  );
}
