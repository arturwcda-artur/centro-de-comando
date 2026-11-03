"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BotaoSair } from "@/components/botao-sair";
import { Aviso, Botao, Campo } from "@/components/ui";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

export function VerificacaoMfa() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function verificar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const codigo = String(new FormData(evento.currentTarget).get("codigo") ?? "").replace(/\D/g, "");
    setEnviando(true);
    setErro(null);
    const supabase = criarClienteNavegador();
    const { data: fatores } = await supabase.auth.mfa.listFactors();
    const totp = fatores?.totp.find((f) => f.status === "verified");
    if (!totp) {
      router.replace("/mfa/cadastrar");
      return;
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code: codigo });
    if (error) {
      setErro("Código inválido ou expirado. Tente o código atual do app.");
      setEnviando(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={verificar} className="space-y-4">
        <Campo
          rotulo="Código de 6 dígitos"
          id="codigo"
          name="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          autoFocus
          required
        />
        {erro && <Aviso>{erro}</Aviso>}
        <Botao type="submit" disabled={enviando} className="w-full">
          {enviando ? "Verificando…" : "Entrar"}
        </Botao>
      </form>
      <BotaoSair />
    </div>
  );
}
