"use client";
import { useActionState } from "react";
import { BotaoEnviar } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import type { EstadoFormulario } from "@/lib/validacao";
import { salvarGatilhos } from "./acoes";

type Linha = { chave: string; titulo: string; ativo: boolean; limite: number; unidade: string };

/** Lista dos gatilhos: liga/desliga e limite de cada um. */
export function FormularioGatilhos({ linhas }: { linhas: Linha[] }) {
  const [estado, enviar] = useActionState<EstadoFormulario, FormData>(salvarGatilhos, {});
  return (
    <form action={enviar} className="space-y-4" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="info">{estado.mensagem}</Aviso>}
      <ul className="divide-y divide-borda">
        {linhas.map((l) => (
          <li key={l.chave} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <label className="flex min-w-0 items-center gap-3 text-sm">
              <input type="checkbox" name={`ativo_${l.chave}`} defaultChecked={l.ativo} className="size-4" />
              <span>{l.titulo}</span>
            </label>
            <span className="flex items-center gap-2 text-sm">
              <input type="number" name={`limite_${l.chave}`} defaultValue={l.limite} min={0} max={999} className="w-20 rounded-lg border border-borda bg-superficie px-2 py-1 text-right tabular-nums" aria-label={`Limite: ${l.titulo}`} />
              <span className="w-32 text-xs text-suave">{l.unidade}</span>
            </span>
            {estado.erros?.[`limite_${l.chave}`] && <p className="w-full text-xs text-alerta">{estado.erros[`limite_${l.chave}`]}</p>}
          </li>
        ))}
      </ul>
      <BotaoEnviar>Gravar gatilhos</BotaoEnviar>
    </form>
  );
}
