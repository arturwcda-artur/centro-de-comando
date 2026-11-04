"use client";
import { useActionState, useState } from "react";
import { BotaoEnviar, CampoAreaTexto, CampoSelecao, CampoTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import type { EstadoFormulario } from "@/lib/validacao";

type Opcao = { valor: string; rotulo: string };

export type ContratoEditavel = {
  obra_id?: string | null;
  contratante_id?: string | null;
  numero?: string | null;
  objeto?: string | null;
  modalidade?: string | null;
  regime?: string | null;
  data_assinatura?: string | null;
  data_inicio?: string | null;
  prazo_original_dias?: number | null;
  data_termino_original?: string | null;
  valor_original?: number | null;
  indice_reajuste?: string | null;
  data_base?: string | null;
  planilha?: string | null;
};

export function FormularioContrato({
  acao,
  contrato = {},
  obras,
  contratantes,
  sugestoes,
}: {
  acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  contrato?: ContratoEditavel;
  obras: Opcao[];
  contratantes: Opcao[];
  sugestoes: Record<string, string>;
}) {
  const [estado, enviar] = useActionState(acao, {});
  const [planilha, setPlanilha] = useState(contrato.planilha ?? "");
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="space-y-4" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelecao
          nome="obra_id"
          rotulo="Obra"
          required
          opcoes={obras}
          vazio="— selecione —"
          defaultValue={contrato.obra_id ?? ""}
          erro={e.obra_id}
          onChange={(x) => {
            if (!planilha) setPlanilha(sugestoes[x.target.value] ?? "");
          }}
        />
        <CampoSelecao nome="contratante_id" rotulo="Contratante" opcoes={contratantes} vazio="— sem contratante —" defaultValue={contrato.contratante_id ?? ""} erro={e.contratante_id} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto nome="numero" rotulo="Número do contrato" required defaultValue={contrato.numero ?? ""} erro={e.numero} />
        <CampoTexto nome="valor_original" rotulo="Valor original (R$)" type="number" step="0.01" min="0" required defaultValue={contrato.valor_original ?? ""} erro={e.valor_original} />
      </div>
      <CampoAreaTexto nome="objeto" rotulo="Objeto" defaultValue={contrato.objeto ?? ""} erro={e.objeto} />
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoTexto nome="data_assinatura" rotulo="Assinatura" type="date" defaultValue={contrato.data_assinatura ?? ""} erro={e.data_assinatura} />
        <CampoTexto nome="data_inicio" rotulo="Início" type="date" defaultValue={contrato.data_inicio ?? ""} erro={e.data_inicio} />
        <CampoTexto nome="data_termino_original" rotulo="Término original" type="date" defaultValue={contrato.data_termino_original ?? ""} erro={e.data_termino_original} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoTexto nome="prazo_original_dias" rotulo="Prazo original (dias)" type="number" min="1" defaultValue={contrato.prazo_original_dias ?? ""} erro={e.prazo_original_dias} />
        <CampoTexto nome="modalidade" rotulo="Modalidade" defaultValue={contrato.modalidade ?? ""} erro={e.modalidade} />
        <CampoTexto nome="regime" rotulo="Regime" defaultValue={contrato.regime ?? ""} erro={e.regime} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto nome="indice_reajuste" rotulo="Índice de reajuste" defaultValue={contrato.indice_reajuste ?? ""} erro={e.indice_reajuste} />
        <CampoTexto nome="data_base" rotulo="Data-base" type="date" defaultValue={contrato.data_base ?? ""} erro={e.data_base} />
      </div>
      <CampoTexto
        nome="planilha"
        rotulo="Planilha de medição"
        value={planilha}
        onChange={(x) => setPlanilha(x.target.value)}
        erro={e.planilha}
        ajuda="Caminho completo do arquivo neste computador. O agente só lê a planilha."
      />
      <BotaoEnviar>Salvar contrato</BotaoEnviar>
    </form>
  );
}
