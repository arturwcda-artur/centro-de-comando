"use client";
import { useActionState, useState } from "react";
import { BotaoEnviar, CampoSelecao, CampoTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import type { EstadoFormulario } from "@/lib/validacao";

type Props = {
  acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  titulo: string;
  listas: { valor: string; rotulo: string }[];
  jaCriado: boolean;
};

/** Cria um cartão novo no Trello. O comentário e o cartão de origem não mudam. */
export function TransformarEmCartao({ acao, titulo, listas, jaCriado }: Props) {
  const [estado, enviar] = useActionState(acao, {});
  const [aberto, setAberto] = useState(false);
  const e = estado.erros ?? {};

  if (jaCriado || estado.ok) return <p className="mt-2 text-xs text-ok">{estado.mensagem ?? "Este comentário já virou cartão."}</p>;
  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="mt-2 text-xs font-medium text-marca hover:underline">
        Transformar em cartão
      </button>
    );
  }
  return (
    <form action={enviar} className="mt-3 space-y-3" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <CampoTexto nome="titulo" rotulo="Título do cartão" required defaultValue={titulo} erro={e.titulo} />
      <CampoSelecao nome="lista" rotulo="Lista" required opcoes={listas} vazio="— selecione —" erro={e.lista} />
      <div className="flex gap-2">
        <BotaoEnviar>Criar no Trello</BotaoEnviar>
        <button type="button" onClick={() => setAberto(false)} className="h-10 rounded-lg border border-borda px-3 text-sm hover:bg-superficie-2">
          Cancelar
        </button>
      </div>
    </form>
  );
}
