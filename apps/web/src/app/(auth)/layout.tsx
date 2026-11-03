import type { ReactNode } from "react";
import { Marca } from "@/components/marca";

export default function LayoutAutenticacao({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Marca />
        </div>
        <div className="rounded-xl border border-borda bg-superficie p-6 shadow-sm">{children}</div>
        <p className="mt-6 text-center text-xs text-suave">Acesso restrito ao proprietário · conexão protegida</p>
      </div>
    </main>
  );
}
