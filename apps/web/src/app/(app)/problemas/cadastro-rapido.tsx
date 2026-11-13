"use client";
import { useActionState, useEffect, useRef } from "react";
import { BotaoEnviar, CampoSelecao, CampoTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import { GRAVIDADE, opcoesEscala, TENDENCIA, URGENCIA } from "@/lib/problemas";
import { adicionarProblemaRapido } from "./acoes";

/** Problema novo direto na lista, já qualificado pela GUT. Detalhes e plano ficam na página do problema. */
export function CadastroRapido({ obras }: { obras: { valor: string; rotulo: string }[] }) {
  const [estado, enviar] = useActionState(adicionarProblemaRapido, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado]);
  const e = estado.erros ?? {};
  return (
    <form ref={ref} action={enviar} className="space-y-3" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.mensagem && <Aviso tipo="info">{estado.mensagem}</Aviso>}
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <CampoTexto nome="titulo" rotulo="Problema" required erro={e.titulo} placeholder="O que está acontecendo?" />
        <CampoSelecao nome="obra_id" rotulo="Obra" opcoes={obras} vazio="— sem obra —" erro={e.obra_id} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <CampoSelecao nome="gravidade" rotulo="Gravidade" opcoes={opcoesEscala(GRAVIDADE)} defaultValue="3" erro={e.gravidade} />
        <CampoSelecao nome="urgencia" rotulo="Urgência" opcoes={opcoesEscala(URGENCIA)} defaultValue="3" erro={e.urgencia} />
        <CampoSelecao nome="tendencia" rotulo="Tendência" opcoes={opcoesEscala(TENDENCIA)} defaultValue="3" erro={e.tendencia} />
      </div>
      <BotaoEnviar>Adicionar problema</BotaoEnviar>
    </form>
  );
}
