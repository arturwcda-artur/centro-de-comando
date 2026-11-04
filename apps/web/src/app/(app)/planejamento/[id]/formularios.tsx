"use client";
import { useActionState, useState } from "react";
import { BotaoEnviar, CampoTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import type { EstadoFormulario } from "@/lib/validacao";

type Acao = (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;

export function FormularioExecutado({ acao, valor, data }: { acao: Acao; valor: number | null; data: string | null }) {
  const [estado, enviar] = useActionState(acao, {});
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="space-y-3" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.mensagem && <Aviso tipo="info">{estado.mensagem}</Aviso>}
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoTexto nome="valor" rotulo="Valor executado (R$)" type="number" step="0.01" min="0" required defaultValue={valor ?? ""} erro={e.valor} ajuda="Use o acumulado medido até a paralisação." />
        <CampoTexto nome="data" rotulo="Data de referência" type="date" required defaultValue={data ?? ""} erro={e.data} />
      </div>
      <BotaoEnviar variante="secundario">Salvar valor</BotaoEnviar>
    </form>
  );
}

export function BotaoLinhaBase({ acao }: { acao: (estado: EstadoFormulario) => Promise<EstadoFormulario> }) {
  const [estado, enviar] = useActionState(acao, {});
  const [confirmando, setConfirmando] = useState(false);
  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="text-xs font-medium text-marca hover:underline">
        Tornar linha de base
      </button>
    );
  }
  return (
    <form action={enviar} className="space-y-2">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <p className="text-xs">A linha de base atual vira histórico e toda a comparação de prazo muda. Confirma?</p>
      <div className="flex gap-2">
        <BotaoEnviar variante="perigo">Sim, trocar</BotaoEnviar>
        <button type="button" onClick={() => setConfirmando(false)} className="h-10 rounded-lg border border-borda px-3 text-sm hover:bg-superficie-2">
          Manter
        </button>
      </div>
    </form>
  );
}
