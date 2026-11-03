import type { Metadata } from "next";
import Link from "next/link";
import { Cartao } from "@/components/ui";
import { carregarOpcoes } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { salvarObra } from "../acoes";
import { FormularioObra } from "../formulario-obra";

export const metadata: Metadata = { title: "Nova obra" };

export default async function PaginaNovaObra() {
  const { supabase } = await exigirSessaoCompleta();
  const opcoes = await carregarOpcoes(supabase);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/obras" className="text-sm text-suave hover:text-texto">
          ← Obras
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Nova obra</h1>
        <p className="text-sm text-suave">
          Para cadastrar a partir das suas pastas, use a{" "}
          <Link href="/obras/importar" className="font-medium text-marca hover:underline">
            importação assistida
          </Link>
          .
        </p>
      </div>
      <Cartao>
        <FormularioObra acao={salvarObra.bind(null, null)} empresas={opcoes.empresas} contratantes={opcoes.contratantes} />
      </Cartao>
    </div>
  );
}
