"use client";
import { useActionState, useEffect, useRef } from "react";
import { BotaoEnviar, CampoAreaTexto, CampoSelecao, CampoTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import { CATEGORIAS_NOTION, PRIORIDADES_NOTION } from "@/lib/dominio";
import { criarDemanda } from "../acoes-notion";

export function FormularioDemanda() {
  const [estado, enviar] = useActionState(criarDemanda, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado]);
  const e = estado.erros ?? {};
  return (
    <form ref={ref} action={enviar} className="space-y-4" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.mensagem && <Aviso tipo="info">{estado.mensagem}</Aviso>}
      <CampoTexto nome="titulo" rotulo="Demanda" required erro={e.titulo} />
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoSelecao nome="prioridade" rotulo="Prioridade" opcoes={PRIORIDADES_NOTION} defaultValue="🟡 Média" erro={e.prioridade} />
        <CampoSelecao nome="categoria" rotulo="Categoria" opcoes={CATEGORIAS_NOTION} defaultValue="Obras" erro={e.categoria} />
        <CampoTexto nome="prazo" rotulo="Prazo" type="date" erro={e.prazo} />
      </div>
      <CampoTexto nome="responsavel" rotulo="Responsável" erro={e.responsavel} />
      <CampoAreaTexto nome="observacoes" rotulo="Observações" erro={e.observacoes} />
      <BotaoEnviar>Criar no Notion</BotaoEnviar>
    </form>
  );
}
