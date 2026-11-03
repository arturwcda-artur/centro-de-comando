"use client";
import { useActionState, useEffect, useRef } from "react";
import { BotaoEnviar, CampoAreaTexto, CampoSelecao, CampoTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import { STATUS_DECISAO } from "@/lib/dominio";
import type { EstadoFormulario } from "@/lib/validacao";
import { salvarDecisao, salvarRisco } from "../acoes";

type Opcao = { valor: string; rotulo: string };
const NOTAS = [1, 2, 3, 4, 5].map((n) => ({ valor: String(n), rotulo: String(n) }));

function useLimparAoSalvar(estado: EstadoFormulario) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado]);
  return ref;
}

export function FormularioRisco({ obraId, pessoas }: { obraId: string; pessoas: Opcao[] }) {
  const [estado, enviar] = useActionState(salvarRisco, {});
  const ref = useLimparAoSalvar(estado);
  const e = estado.erros ?? {};
  return (
    <form ref={ref} action={enviar} className="space-y-4" noValidate>
      <input type="hidden" name="obra_id" value={obraId} />
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.mensagem && <Aviso tipo="info">{estado.mensagem}</Aviso>}
      <CampoAreaTexto nome="descricao" rotulo="Risco" required erro={e.descricao} placeholder="O que pode acontecer e qual a consequência" />
      <div className="grid gap-4 sm:grid-cols-4">
        <CampoSelecao nome="probabilidade" rotulo="Probabilidade (1–5)" required opcoes={NOTAS} defaultValue="3" erro={e.probabilidade} />
        <CampoSelecao nome="impacto" rotulo="Impacto (1–5)" required opcoes={NOTAS} defaultValue="3" erro={e.impacto} />
        <CampoTexto nome="categoria" rotulo="Categoria" erro={e.categoria} placeholder="Prazo, custo, técnico…" />
        <CampoTexto nome="origem" rotulo="Origem" erro={e.origem} placeholder="Reunião, vistoria…" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelecao nome="responsavel_id" rotulo="Responsável" opcoes={pessoas} vazio="— não definido —" erro={e.responsavel_id} />
        <CampoTexto nome="prazo" rotulo="Prazo da resposta" type="date" erro={e.prazo} />
      </div>
      <CampoAreaTexto nome="plano_resposta" rotulo="Plano de resposta" erro={e.plano_resposta} />
      <BotaoEnviar>Registrar risco</BotaoEnviar>
    </form>
  );
}

export function FormularioDecisao({ obraId, pessoas }: { obraId: string; pessoas: Opcao[] }) {
  const [estado, enviar] = useActionState(salvarDecisao, {});
  const ref = useLimparAoSalvar(estado);
  const e = estado.erros ?? {};
  return (
    <form ref={ref} action={enviar} className="space-y-4" noValidate>
      <input type="hidden" name="obra_id" value={obraId} />
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.mensagem && <Aviso tipo="info">{estado.mensagem}</Aviso>}
      <CampoAreaTexto nome="problema" rotulo="Problema ou questão" required erro={e.problema} />
      <CampoAreaTexto nome="decisao" rotulo="Decisão tomada" erro={e.decisao} ajuda="Deixe vazio se ainda está pendente." />
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoSelecao nome="status" rotulo="Situação" opcoes={STATUS_DECISAO} defaultValue="pendente" erro={e.status} />
        <CampoSelecao nome="responsavel_id" rotulo="Responsável" opcoes={pessoas} vazio="— não definido —" erro={e.responsavel_id} />
        <CampoTexto nome="prazo" rotulo="Prazo" type="date" erro={e.prazo} />
      </div>
      <BotaoEnviar>Registrar decisão</BotaoEnviar>
    </form>
  );
}
