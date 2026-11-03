"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BotaoSair } from "@/components/botao-sair";
import { Aviso, Botao, Campo } from "@/components/ui";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

type Fator = { id: string; qr: string; segredo: string };

export function CadastroMfa() {
  const router = useRouter();
  const iniciou = useRef(false);
  const [fator, setFator] = useState<Fator | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (iniciou.current) return; // evita cadastrar dois fatores no modo estrito do React
    iniciou.current = true;
    (async () => {
      const supabase = criarClienteNavegador();
      // Remove tentativas de cadastro não concluídas antes de começar outra
      const { data: lista } = await supabase.auth.mfa.listFactors();
      for (const f of lista?.all ?? []) {
        if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Autenticador ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error || !data) {
        setErro("Não foi possível iniciar o cadastro do autenticador. Recarregue a página.");
        return;
      }
      setFator({ id: data.id, qr: data.totp.qr_code, segredo: data.totp.secret });
    })();
  }, []);

  async function confirmar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!fator) return;
    const codigo = String(new FormData(evento.currentTarget).get("codigo") ?? "").replace(/\D/g, "");
    setEnviando(true);
    setErro(null);
    const { error } = await criarClienteNavegador().auth.mfa.challengeAndVerify({ factorId: fator.id, code: codigo });
    if (error) {
      setErro("Código inválido ou expirado. Confira o horário do celular e tente o código atual.");
      setEnviando(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-suave">
        <li>No app autenticador, escolha adicionar conta e leia o QR code.</li>
        <li>Digite o código de 6 dígitos que aparecer no app.</li>
      </ol>
      <div className="flex justify-center rounded-lg bg-white p-3">
        {fator ? (
          // eslint-disable-next-line @next/next/no-img-element -- QR em data URI gerado pelo Supabase
          <img src={fator.qr} alt="QR code para o app autenticador" className="size-44" />
        ) : (
          <div className="size-44 animate-pulse rounded bg-slate-200" aria-label="Gerando QR code" />
        )}
      </div>
      {fator && (
        <details className="text-xs text-suave">
          <summary className="cursor-pointer">Não consegue ler o QR? Digite a chave</summary>
          <code className="mt-2 block break-all rounded bg-superficie-2 p-2 font-mono text-texto">{fator.segredo}</code>
        </details>
      )}
      <form onSubmit={confirmar} className="space-y-4">
        <Campo
          rotulo="Código de 6 dígitos"
          id="codigo"
          name="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
        />
        {erro && <Aviso>{erro}</Aviso>}
        <Botao type="submit" disabled={!fator || enviando} className="w-full">
          {enviando ? "Confirmando…" : "Ativar e entrar"}
        </Botao>
      </form>
      <BotaoSair />
    </div>
  );
}
