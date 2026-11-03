"use client";
import { useActionState, useEffect, useRef } from "react";
import { BotaoEnviar } from "@/components/formulario";
import { criarTarefaRapida } from "../tarefas/acoes";

type Opcao = { valor: string; rotulo: string };

/** Captura rápida de tarefa: título + prazo + obra, sem sair do Meu dia. */
export function CapturaRapida({ obras, hoje }: { obras: Opcao[]; hoje: string }) {
  const [estado, enviar] = useActionState(criarTarefaRapida, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) {
      ref.current?.reset();
      ref.current?.querySelector<HTMLInputElement>("input[name=titulo]")?.focus();
    }
  }, [estado]);
  const erro = estado.erros?.titulo ?? estado.erros?.prazo ?? estado.erro;

  return (
    <form ref={ref} action={enviar} className="flex flex-col gap-2 sm:flex-row" noValidate>
      <input
        name="titulo"
        required
        aria-label="Nova tarefa"
        placeholder="Anotar uma tarefa… (Enter para salvar)"
        className="h-10 flex-1 rounded-lg border border-borda bg-superficie-2 px-3 text-sm outline-none focus:border-marca focus:ring-2 focus:ring-marca/20"
      />
      <input name="prazo" type="date" defaultValue={hoje} aria-label="Prazo" className="h-10 rounded-lg border border-borda bg-superficie-2 px-2 text-sm" />
      <select name="obra_id" aria-label="Obra" className="h-10 rounded-lg border border-borda bg-superficie-2 px-2 text-sm sm:max-w-[12rem]">
        <option value="">Sem obra</option>
        {obras.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      <BotaoEnviar>Adicionar</BotaoEnviar>
      {erro && <p className="text-xs text-alerta sm:hidden">{erro}</p>}
    </form>
  );
}
