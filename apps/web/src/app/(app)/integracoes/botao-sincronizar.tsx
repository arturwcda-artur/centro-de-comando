"use client";
import { RefreshCw } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Aviso } from "@/components/ui";
import { sincronizarAgora } from "./acoes";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-lg border border-borda bg-superficie px-3 text-sm font-medium hover:bg-superficie-2 disabled:opacity-50">
      <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} aria-hidden="true" /> Sincronizar agora
    </button>
  );
}

export function BotaoSincronizar() {
  const [estado, enviar] = useActionState(sincronizarAgora, {});
  return (
    <form action={enviar} className="space-y-2">
      <Botao />
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.mensagem && <Aviso tipo="info">{estado.mensagem}</Aviso>}
    </form>
  );
}
