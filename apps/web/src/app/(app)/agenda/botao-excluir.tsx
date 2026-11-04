"use client";
import { useActionState, useState } from "react";
import { BotaoEnviar } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import { excluirCompromisso } from "./acoes";

/** A exclusão acontece no Google, por isso pede confirmação antes. */
export function BotaoExcluir({ id }: { id: string }) {
  const [estado, enviar] = useActionState(excluirCompromisso.bind(null, id), {});
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="inline-flex h-10 items-center rounded-lg border border-alerta/40 px-4 text-sm font-medium text-alerta hover:bg-alerta-suave">
        Excluir compromisso
      </button>
    );
  }
  return (
    <form action={enviar} className="space-y-3">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <p className="text-sm">Excluir este compromisso também do Google Agenda? Em evento recorrente, sai só esta data.</p>
      <div className="flex flex-wrap gap-2">
        <BotaoEnviar variante="perigo">Sim, excluir</BotaoEnviar>
        <button type="button" onClick={() => setConfirmando(false)} className="inline-flex h-10 items-center rounded-lg border border-borda px-4 text-sm font-medium hover:bg-superficie-2">
          Manter
        </button>
      </div>
    </form>
  );
}
