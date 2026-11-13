"use client";
import { useActionState } from "react";
import { BotaoEnviar, CampoSelecao, CampoTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import { PRIORIDADES } from "@/lib/cartao-acao";
import type { EstadoFormulario } from "@/lib/validacao";

type Opcao = { valor: string; rotulo: string };
type Props = {
  acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  listas: Opcao[];
  membros: Opcao[];
  valores: { titulo: string; lista: string | null; membro: string | null; prazo: string | null; prioridade: string };
};

/** Dados do cartão que a ação 5W2H vira no Trello (RN-49k). */
export function FormularioCartao({ acao, listas, membros, valores }: Props) {
  const [estado, enviar] = useActionState(acao, {});
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="space-y-4" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <CampoTexto nome="titulo" rotulo="Título do cartão" required defaultValue={valores.titulo} erro={e.titulo} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelecao nome="lista" rotulo="Lista no quadro da equipe" required opcoes={listas} vazio="— selecione —" defaultValue={valores.lista ?? ""} erro={e.lista} />
        <CampoSelecao nome="membro" rotulo="Responsável no Trello" opcoes={membros} vazio="— sem responsável —" defaultValue={valores.membro ?? ""} erro={e.membro} />
        <CampoTexto nome="prazo" rotulo="Data de entrega" type="date" defaultValue={valores.prazo ?? ""} erro={e.prazo} />
        <CampoSelecao nome="prioridade" rotulo="Prioridade" required opcoes={PRIORIDADES} defaultValue={valores.prioridade} erro={e.prioridade} ajuda="Vira uma etiqueta colorida no cartão." />
      </div>
      <BotaoEnviar>Criar cartão no Trello</BotaoEnviar>
    </form>
  );
}
