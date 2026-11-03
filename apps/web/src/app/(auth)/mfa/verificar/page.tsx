import type { Metadata } from "next";
import { VerificacaoMfa } from "./verificacao";

export const metadata: Metadata = { title: "Código do autenticador" };

export default function PaginaVerificarMfa() {
  return (
    <>
      <h1 className="text-lg font-semibold">Código do autenticador</h1>
      <p className="mb-5 mt-1 text-sm text-suave">Abra o app autenticador no celular e digite o código atual.</p>
      <VerificacaoMfa />
    </>
  );
}
