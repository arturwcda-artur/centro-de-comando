"use client";
import { useActionState, useState } from "react";
import { BotaoEnviar, CampoAreaTexto, CampoSelecao, CampoTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import { STATUS_TAREFA, TIPOS_TAREFA } from "@/lib/dominio";
import type { EstadoFormulario } from "@/lib/validacao";

type Opcao = { valor: string; rotulo: string };
const NOTAS = [1, 2, 3, 4, 5].map((n) => ({ valor: String(n), rotulo: String(n) }));

export type TarefaEditavel = {
  titulo?: string | null;
  descricao?: string | null;
  obra_id?: string | null;
  responsavel_id?: string | null;
  aguardando_pessoa_id?: string | null;
  tipo?: string | null;
  categoria?: string | null;
  prazo?: string | null;
  importancia?: number | null;
  impacto?: number | null;
  critica?: boolean | null;
  status?: string | null;
};

export function FormularioTarefa({
  acao,
  tarefa = {},
  obras,
  pessoas,
}: {
  acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  tarefa?: TarefaEditavel;
  obras: Opcao[];
  pessoas: Opcao[];
}) {
  const [estado, enviar] = useActionState(acao, {});
  const [status, setStatus] = useState(tarefa.status ?? "a_fazer");
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="space-y-4" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <CampoTexto nome="titulo" rotulo="Título" required defaultValue={tarefa.titulo ?? ""} erro={e.titulo} />
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoSelecao nome="obra_id" rotulo="Obra" opcoes={obras} vazio="— sem obra —" defaultValue={tarefa.obra_id ?? ""} erro={e.obra_id} />
        <CampoSelecao nome="tipo" rotulo="Tipo" opcoes={TIPOS_TAREFA} defaultValue={tarefa.tipo ?? "acao"} erro={e.tipo} />
        <CampoTexto nome="prazo" rotulo="Prazo" type="date" defaultValue={tarefa.prazo ?? ""} erro={e.prazo} ajuda="O sistema nunca altera prazos sozinho." />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoSelecao nome="importancia" rotulo="Importância (1–5)" opcoes={NOTAS} defaultValue={String(tarefa.importancia ?? 3)} erro={e.importancia} />
        <CampoSelecao nome="impacto" rotulo="Impacto (1–5)" opcoes={NOTAS} defaultValue={String(tarefa.impacto ?? 3)} erro={e.impacto} />
        <CampoTexto nome="categoria" rotulo="Categoria" defaultValue={tarefa.categoria ?? ""} erro={e.categoria} placeholder="Medição, compras…" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoSelecao nome="status" rotulo="Situação" opcoes={STATUS_TAREFA} value={status} onChange={(ev) => setStatus(ev.target.value)} erro={e.status} />
        <CampoSelecao nome="responsavel_id" rotulo="Responsável" opcoes={pessoas} vazio="— eu —" defaultValue={tarefa.responsavel_id ?? ""} erro={e.responsavel_id} />
        {status === "aguardando_terceiro" && (
          <CampoSelecao
            nome="aguardando_pessoa_id"
            rotulo="Aguardando quem"
            required
            opcoes={pessoas}
            vazio="— escolher —"
            defaultValue={tarefa.aguardando_pessoa_id ?? ""}
            erro={e.aguardando_pessoa_id}
          />
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="critica" defaultChecked={!!tarefa.critica} className="size-4 accent-[var(--marca)]" />
        Marcar como crítica
      </label>
      <CampoAreaTexto nome="descricao" rotulo="Descrição" defaultValue={tarefa.descricao ?? ""} erro={e.descricao} />
      <BotaoEnviar>Salvar tarefa</BotaoEnviar>
    </form>
  );
}
