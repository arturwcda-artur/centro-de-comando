"use client";
import { useActionState } from "react";
import { BotaoEnviar, CampoAreaTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import type { EstadoFormulario } from "@/lib/validacao";

/** Concluir com saída/decisão e a ressalva de planejamento (RN-49m). */
export function FormularioConclusao({ acao }: { acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario> }) {
  const [estado, enviar] = useActionState(acao, {});
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="space-y-3" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <CampoAreaTexto nome="decisao" rotulo="Saída / decisão (opcional)" rows={3} erro={e.decisao} ajuda="Fica registrada na obra e vai como comentário no cartão do quadro tarefas." />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="afeta_planejamento" className="mt-0.5 size-4 accent-[var(--marca)]" />
        <span>
          <strong>Afeta o planejamento da obra.</strong> Cria a tarefa de atualizar o cronograma com esta decisão. O arquivo do Project não é alterado.
        </span>
      </label>
      <BotaoEnviar>Concluir tarefa</BotaoEnviar>
    </form>
  );
}
