"use client";
import { useActionState } from "react";
import { BotaoEnviar, CampoTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import type { EstadoFormulario } from "@/lib/validacao";

/** "Adiar": o prazo da tarefa passa para a data escolhida. */
export function FormularioAdiar({ acao, amanha }: { acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>; amanha: string }) {
  const [estado, enviar] = useActionState(acao, {});
  return (
    <form action={enviar} className="space-y-3" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="info">{estado.mensagem}</Aviso>}
      <CampoTexto nome="adiar_ate" rotulo="Novo prazo" type="date" required defaultValue={amanha} erro={estado.erros?.adiar_ate} />
      <BotaoEnviar variante="secundario">Adiar</BotaoEnviar>
    </form>
  );
}
