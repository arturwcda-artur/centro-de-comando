"use client";
import { useActionState } from "react";
import { BotaoEnviar } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import type { EstadoFormulario } from "@/lib/validacao";

/** Aprovar a alteração calculada (RN-49n). O servidor recalcula com o cronograma do banco. */
export function FormularioAprovar({ acao, atividade, tipo, dias }: { acao: (e: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>; atividade: string; tipo: string; dias: number }) {
  const [estado, enviar] = useActionState(acao, {});
  return (
    <form action={enviar} className="space-y-2">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <input type="hidden" name="atividade" value={atividade} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="dias" value={dias} />
      <BotaoEnviar>Aprovar a alteração</BotaoEnviar>
    </form>
  );
}
