import type { ReactNode } from "react";
import { exigirSessaoCompleta } from "@/lib/sessao";

/** Relatórios para imprimir: sem menu e sem cabeçalho do sistema. */
export default async function LayoutImpressao({ children }: { children: ReactNode }) {
  await exigirSessaoCompleta();
  return <main className="min-h-dvh py-4 print:py-0">{children}</main>;
}
