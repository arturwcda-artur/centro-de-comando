"use client";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/** Busca global (atalho: Ctrl+K ou /). Envia para /busca?q=… */
export function BuscaGlobal() {
  const router = useRouter();
  const params = useSearchParams();
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function atalho(e: KeyboardEvent) {
      const digitando = (e.target as HTMLElement)?.closest("input, textarea, [contenteditable]");
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !digitando)) {
        e.preventDefault();
        campo.current?.focus();
      }
    }
    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, []);

  return (
    <form
      role="search"
      className="relative w-full max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
        if (q) router.push(`/busca?q=${encodeURIComponent(q)}`);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-suave" aria-hidden="true" />
      <input
        ref={campo}
        name="q"
        type="search"
        defaultValue={params.get("q") ?? ""}
        placeholder="Buscar obras, tarefas, documentos…"
        aria-label="Busca global"
        className="h-10 w-full rounded-lg border border-borda bg-superficie-2 pl-9 pr-16 text-sm outline-none transition focus:border-marca focus:ring-2 focus:ring-marca/20"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-borda px-1.5 text-[10px] text-suave sm:block">
        Ctrl K
      </kbd>
    </form>
  );
}
