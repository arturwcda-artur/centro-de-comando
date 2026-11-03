import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconeModulo } from "@/components/icone-modulo";
import { Cartao } from "@/components/ui";
import { moduloPorSlug } from "@/lib/navegacao";

// Sem generateStaticParams: páginas protegidas por login são sempre geradas na hora (ADR 0010).
// Slugs desconhecidos caem no notFound() abaixo.

export async function generateMetadata({ params }: PageProps<"/[modulo]">): Promise<Metadata> {
  const { modulo } = await params;
  return { title: moduloPorSlug(modulo)?.titulo ?? "Módulo" };
}

/** Módulos ainda não entregues: mostra o que virá e em qual fase do roadmap. */
export default async function PaginaModulo({ params }: PageProps<"/[modulo]">) {
  const { modulo } = await params;
  const m = moduloPorSlug(modulo);
  if (!m || !m.slug) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-lg bg-marca-suave text-marca">
          <IconeModulo icone={m.icone} className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{m.titulo}</h1>
          <p className="text-sm text-suave">{m.descricao}</p>
        </div>
      </div>
      <Cartao>
        <p className="text-sm">
          Este módulo será entregue na <strong>Fase {m.fase}</strong> do roadmap. A estrutura de dados dele já está
          pronta no banco.
        </p>
        <Link href="/" className="mt-3 inline-block text-sm font-medium text-marca hover:underline">
          Voltar ao painel
        </Link>
      </Cartao>
    </div>
  );
}
