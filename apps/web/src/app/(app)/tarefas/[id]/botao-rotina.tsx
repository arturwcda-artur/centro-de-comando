"use client";
import { useActionState } from "react";
import { BotaoEnviar } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import type { EstadoFormulario } from "@/lib/validacao";

/** Só o proprietário decide o que é rotina. Nada é gravado no Trello. */
export function BotaoRotina({ acao, rotina }: { acao: (estado: EstadoFormulario) => Promise<EstadoFormulario>; rotina: boolean }) {
  const [estado, enviar] = useActionState(acao, {});
  return (
    <form action={enviar} className="space-y-2">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <p className="text-sm text-suave">
        {rotina
          ? "Este cartão é de rotina: fica fora da eficiência no prazo. Os itens continuam contando na taxa de resolução."
          : "Use em cartões renovados sempre, como pedidos de compra. Eles saem da eficiência no prazo, e os itens continuam contando na taxa de resolução."}
      </p>
      <BotaoEnviar variante="secundario">{rotina ? "Deixar de ser rotina" : "Marcar como rotina"}</BotaoEnviar>
    </form>
  );
}
