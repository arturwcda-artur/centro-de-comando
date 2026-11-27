import type { Metadata } from "next";
import Link from "next/link";
import { IconeModulo } from "@/components/icone-modulo";
import { Cartao } from "@/components/ui";
import { MODULOS } from "@/lib/navegacao";

export const metadata: Metadata = { title: "Configurações" };

/** Configurações (Doutrina do Centro de Comando): gatilhos, integrações e cadastros num lugar só. */
export default function PaginaConfiguracoes() {
  const itens = MODULOS.filter((m) => m.menu === "Configurações" && m.href !== "/configuracoes");
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-suave">O que ajusta o funcionamento do sistema. O dia a dia fica na Mesa e nas Obras.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {itens.map((m) => (
          <Link key={m.href} href={m.href} className="block">
            <Cartao className="h-full hover:bg-superficie-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <IconeModulo icone={m.icone} /> {m.titulo}
              </div>
              <p className="mt-1 text-xs text-suave">{m.descricao}</p>
            </Cartao>
          </Link>
        ))}
      </div>
    </div>
  );
}
