"use client";
import type { ReactNode } from "react";

/** Abre a janela de impressão do navegador, onde o usuário escolhe Salvar como PDF. */
export function BotaoSalvarPdf() {
  return (
    <button type="button" onClick={() => window.print()} className="nao-imprimir inline-flex h-10 items-center rounded-lg bg-marca px-4 text-sm font-medium text-white hover:opacity-90">
      Salvar em PDF
    </button>
  );
}

export function FolhaRelatorio({ titulo, subtitulo, fonte, geradoEm, children }: { titulo: string; subtitulo: string; fonte: string; geradoEm: string; children: ReactNode }) {
  return (
    <div className="folha mx-auto max-w-[190mm] space-y-4 bg-superficie p-6 text-sm">
      <header className="flex items-start justify-between gap-4 border-b border-borda pb-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-alerta">Uso interno</p>
          <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
          <p className="text-xs text-suave">{subtitulo}</p>
        </div>
        <BotaoSalvarPdf />
      </header>
      {children}
      <footer className="border-t border-borda pt-2 text-[10px] text-suave">
        Gerado em {geradoEm}. Fonte: {fonte}. Centro de Comando.
      </footer>
    </div>
  );
}

export function SecaoRelatorio({ titulo, vazia, children }: { titulo: string; vazia?: boolean; children: ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-1.5 text-sm font-semibold">{titulo}</h2>
      {vazia ? <p className="text-xs text-suave">Sem dados cadastrados.</p> : children}
    </section>
  );
}

export function NumerosRelatorio({ itens }: { itens: readonly (readonly [string, string])[] }) {
  return (
    <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {itens.map(([rotulo, valor]) => (
        <div key={rotulo} className="rounded border border-borda p-2">
          <dt className="text-[10px] text-suave">{rotulo}</dt>
          <dd className="font-semibold tabular-nums">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}
