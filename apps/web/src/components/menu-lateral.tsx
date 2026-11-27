"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { IconeModulo } from "@/components/icone-modulo";
import { Marca } from "@/components/marca";
import { MENUS, MODULOS, moduloAtivo } from "@/lib/navegacao";

const LINK = "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition";
const ATIVO = "bg-lateral-ativo font-medium text-white";
const INATIVO = "text-lateral-texto hover:bg-lateral-ativo/60 hover:text-white";

/**
 * Menu de 5 itens (Doutrina do Centro de Comando): Mesa, Obras, Agenda, Equipe e Configurações.
 * As demais telas aparecem como subitens só do item aberto, para nada sumir.
 */
function Itens({ rodape, aoNavegar }: { rodape: ReactNode; aoNavegar?: () => void }) {
  const ativo = moduloAtivo(usePathname());
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <Link href="/" aria-label="Ir para a Mesa">
          <Marca clara />
        </Link>
      </div>
      <nav aria-label="Módulos" className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-0.5">
          {MENUS.map((menu) => {
            const aberto = ativo?.menu === menu.nome;
            const subitens = MODULOS.filter((m) => m.menu === menu.nome && m.href !== menu.href);
            return (
              <li key={menu.nome}>
                <Link href={menu.href} onClick={aoNavegar} aria-current={ativo?.href === menu.href ? "page" : undefined} className={`${LINK} ${ativo?.href === menu.href ? ATIVO : aberto ? "font-medium text-white" : INATIVO}`}>
                  <IconeModulo icone={menu.icone} />
                  <span className="flex-1 truncate">{menu.nome}</span>
                </Link>
                {aberto && subitens.length > 0 && (
                  <ul className="mb-2 ml-5 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                    {subitens.map((m) => (
                      <li key={m.href}>
                        <Link href={m.href} onClick={aoNavegar} aria-current={ativo?.href === m.href ? "page" : undefined} className={`${LINK} py-1.5 ${ativo?.href === m.href ? ATIVO : INATIVO}`}>
                          <span className="flex-1 truncate">{m.titulo}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
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
