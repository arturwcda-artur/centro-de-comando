import type { Metadata } from "next";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default function PaginaLogin() {
  return (
    <>
      <h1 className="text-lg font-semibold">Entrar</h1>
      <p className="mb-5 mt-1 text-sm text-suave">Use seu e-mail e senha. Em seguida, o código do app autenticador.</p>
      <FormularioLogin />
    </>
  );
}
