"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { IconeModulo } from "@/components/icone-modulo";
import { Marca } from "@/components/marca";
import { MODULOS, moduloAtivo, type Modulo } from "@/lib/navegacao";

const GRUPOS: Modulo["grupo"][] = ["Visão geral", "Gestão", "Controle", "Sistema"];

function Itens({ rodape, aoNavegar }: { rodape: ReactNode; aoNavegar?: () => void }) {
  const ativo = moduloAtivo(usePathname());
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <Link href="/" aria-label="Ir para o painel">
          <Marca clara />
        </Link>
      </div>
      <nav aria-label="Módulos" className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {GRUPOS.map((grupo) => (
          <div key={grupo}>
            <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-lateral-texto/60">{grupo}</p>
            <ul className="space-y-0.5">
              {MODULOS.filter((m) => m.grupo === grupo).map((m) => {
                const atual = ativo?.href === m.href;
                return (
                  <li key={m.href}>
                    <Link
                      href={m.href}
                      onClick={aoNavegar}
                      aria-current={atual ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition ${
                        atual ? "bg-lateral-ativo font-medium text-white" : "text-lateral-texto hover:bg-lateral-ativo/60 hover:text-white"
                      }`}
                    >
                      <IconeModulo icone={m.icone} />
                      <span className="flex-1 truncate">{m.titulo}</span>
                      {m.fase > 3 && <span className="text-[10px] text-lateral-texto/50">F{m.fase}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/5 p-3">{rodape}</div>
    </div>
  );
}

/** Menu lateral fixo no computador; gaveta no celular. */
export function MenuLateral({ rodape }: { rodape: ReactNode }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-lateral lg:block">
        <Itens rodape={rodape} />
      </aside>

      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex size-10 items-center justify-center rounded-lg text-suave hover:bg-superficie-2 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </button>

      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setAberto(false)} aria-label="Fechar menu" />
          <aside className="relative h-full w-72 max-w-[85vw] bg-lateral shadow-xl">
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="absolute right-3 top-5 inline-flex size-9 items-center justify-center rounded-lg text-lateral-texto hover:bg-lateral-ativo"
              aria-label="Fechar menu"
            >
              <X className="size-5" />
            </button>
            <Itens rodape={rodape} aoNavegar={() => setAberto(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
