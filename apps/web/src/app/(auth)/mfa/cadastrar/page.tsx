import type { Metadata } from "next";
import { CadastroMfa } from "./cadastro";

export const metadata: Metadata = { title: "Configurar autenticador" };

export default function PaginaCadastrarMfa() {
  return (
    <>
      <h1 className="text-lg font-semibold">Configure o segundo fator</h1>
      <p className="mb-5 mt-1 text-sm text-suave">
        Obrigatório para acessar o sistema. Use um app autenticador no celular (Google Authenticator, Microsoft
        Authenticator, 1Password…).
      </p>
      <CadastroMfa />
    </>
  );
}
