"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** O navegador não abre arquivo local: sem link do Drive, copia o caminho para abrir no computador. */
export function CopiarCaminho({ caminho }: { caminho: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      title={caminho}
      onClick={async () => {
        await navigator.clipboard.writeText(caminho);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-borda px-2 text-xs hover:bg-superficie-2"
    >
      {copiado ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      {copiado ? "Copiado" : "Copiar caminho"}
    </button>
  );
}
