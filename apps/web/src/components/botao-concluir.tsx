"use client";
import { Check } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { concluirTarefa } from "@/app/(app)/tarefas/acoes";

function Circulo({ titulo }: { titulo: string | null }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title="Concluir"
      aria-label={`Concluir: ${titulo}`}
      className={`inline-flex size-7 items-center justify-center rounded-full border transition ${
        pending ? "animate-pulse border-ok text-ok" : "border-borda text-transparent hover:border-ok hover:text-ok"
      }`}
    >
      <Check className="size-3.5" />
    </button>
  );
}

/** Concluir uma tarefa. Em tarefas do Trello e do Notion, conclui também na origem (RN-48). */
export function BotaoConcluir({ id, titulo }: { id: string; titulo: string | null }) {
  const [estado, enviar] = useActionState(concluirTarefa.bind(null, id), {});
  return (
    <form action={enviar} className="shrink-0">
      <Circulo titulo={titulo} />
      {estado.erro && (
        <p role="alert" className="absolute z-10 mt-1 max-w-xs rounded-md bg-alerta-suave px-2 py-1 text-xs text-alerta shadow">
          {estado.erro}
        </p>
      )}
    </form>
  );
}
