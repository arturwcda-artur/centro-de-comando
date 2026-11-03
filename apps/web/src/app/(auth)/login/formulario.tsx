"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Aviso, Botao, Campo } from "@/components/ui";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

export function FormularioLogin() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    setEnviando(true);
    setErro(null);
    const { error } = await criarClienteNavegador().auth.signInWithPassword({
      email: String(dados.get("email") ?? "").trim(),
      password: String(dados.get("senha") ?? ""),
    });
    if (error) {
      setErro(
        error.message.includes("Invalid login") ? "E-mail ou senha incorretos." : "Não foi possível entrar. Tente novamente.",
      );
      setEnviando(false);
      return;
    }
    router.replace("/"); // o proxy encaminha para o segundo fator
    router.refresh();
  }

  return (
    <form onSubmit={entrar} className="space-y-4">
      <Campo rotulo="E-mail" id="email" name="email" type="email" autoComplete="username" required />
      <Campo rotulo="Senha" id="senha" name="senha" type="password" autoComplete="current-password" required />
      {erro && <Aviso>{erro}</Aviso>}
      <Botao type="submit" disabled={enviando} className="w-full">
        {enviando ? "Entrando…" : "Entrar"}
      </Botao>
    </form>
  );
}
