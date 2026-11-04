"use client";
import { useActionState, useState } from "react";
import { BotaoEnviar, CampoAreaTexto, CampoSelecao, CampoTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import type { EstadoFormulario } from "@/lib/validacao";

export type CompromissoEditavel = {
  titulo?: string | null;
  data?: string;
  data_fim?: string;
  dia_inteiro?: boolean;
  inicio?: string;
  fim?: string;
  local?: string | null;
  descricao?: string | null;
  obra_id?: string | null;
};

export function FormularioCompromisso({
  acao,
  compromisso = {},
  obras,
  rotuloBotao,
}: {
  acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  compromisso?: CompromissoEditavel;
  obras: { valor: string; rotulo: string }[];
  rotuloBotao: string;
}) {
  const [estado, enviar] = useActionState(acao, {});
  const [diaInteiro, setDiaInteiro] = useState(compromisso.dia_inteiro ?? false);
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="space-y-4" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <CampoTexto nome="titulo" rotulo="Título" required defaultValue={compromisso.titulo ?? ""} erro={e.titulo} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="dia_inteiro" checked={diaInteiro} onChange={(x) => setDiaInteiro(x.target.checked)} className="size-4" />
        Dia inteiro
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto nome="data" rotulo="Data" type="date" required defaultValue={compromisso.data ?? ""} erro={e.data} />
        <CampoTexto nome="data_fim" rotulo="Data final" type="date" defaultValue={compromisso.data_fim ?? ""} erro={e.data_fim} ajuda="Em branco: a mesma data." />
      </div>
      {!diaInteiro && (
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto nome="inicio" rotulo="Início" type="time" required defaultValue={compromisso.inicio ?? ""} erro={e.inicio} />
          <CampoTexto nome="fim" rotulo="Término" type="time" required defaultValue={compromisso.fim ?? ""} erro={e.fim} />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto nome="local" rotulo="Local" defaultValue={compromisso.local ?? ""} erro={e.local} />
        <CampoSelecao nome="obra_id" rotulo="Obra" opcoes={obras} vazio="— sem obra —" defaultValue={compromisso.obra_id ?? ""} erro={e.obra_id} ajuda="Fica só no sistema, não vai para o Google." />
      </div>
      <CampoAreaTexto nome="descricao" rotulo="Descrição" defaultValue={compromisso.descricao ?? ""} erro={e.descricao} />
      <BotaoEnviar>{rotuloBotao}</BotaoEnviar>
    </form>
  );
}
