"use client";
import { useActionState } from "react";
import { BotaoEnviar, CampoAreaTexto, CampoSelecao, CampoTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import { SITUACOES_OBRA, UFS } from "@/lib/dominio";
import type { EstadoFormulario } from "@/lib/validacao";

type Obra = {
  codigo?: string | null;
  nome?: string | null;
  situacao?: string | null;
  empresa_id?: string | null;
  contratante_id?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  uf?: string | null;
  data_inicio?: string | null;
  data_termino_prevista?: string | null;
  pasta_local?: string | null;
  planilha_acoes?: string | null;
  observacoes?: string | null;
};
type Opcao = { valor: string; rotulo: string };

export function FormularioObra({
  acao,
  obra = {},
  empresas,
  contratantes,
}: {
  acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  obra?: Obra;
  empresas: Opcao[];
  contratantes: Opcao[];
}) {
  const [estado, enviar] = useActionState(acao, {});
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="space-y-5" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoTexto nome="codigo" rotulo="Código" required defaultValue={obra.codigo ?? ""} erro={e.codigo} ajuda="Ex.: PRF-RECANTO" />
        <div className="sm:col-span-2">
          <CampoTexto nome="nome" rotulo="Nome da obra" required defaultValue={obra.nome ?? ""} erro={e.nome} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoSelecao nome="situacao" rotulo="Situação" required opcoes={SITUACOES_OBRA} defaultValue={obra.situacao ?? "planejamento"} erro={e.situacao} />
        <CampoSelecao nome="empresa_id" rotulo="Empresa executora" opcoes={empresas} vazio="— não informada —" defaultValue={obra.empresa_id ?? ""} erro={e.empresa_id} />
        <CampoSelecao nome="contratante_id" rotulo="Contratante" opcoes={contratantes} vazio="— não informado —" defaultValue={obra.contratante_id ?? ""} erro={e.contratante_id} />
      </div>
      <div className="grid gap-4 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <CampoTexto nome="endereco" rotulo="Endereço" defaultValue={obra.endereco ?? ""} erro={e.endereco} />
        </div>
        <div className="sm:col-span-2">
          <CampoTexto nome="cidade" rotulo="Cidade" defaultValue={obra.cidade ?? ""} erro={e.cidade} />
        </div>
        <CampoSelecao nome="uf" rotulo="UF" opcoes={UFS.map((u) => ({ valor: u, rotulo: u }))} vazio="—" defaultValue={obra.uf ?? ""} erro={e.uf} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto nome="data_inicio" rotulo="Início" type="date" defaultValue={obra.data_inicio ?? ""} erro={e.data_inicio} />
        <CampoTexto
          nome="data_termino_prevista"
          rotulo="Término previsto (gerencial)"
          type="date"
          defaultValue={obra.data_termino_prevista ?? ""}
          erro={e.data_termino_prevista}
          ajuda="O prazo contratual vem dos contratos e aditivos (Fase 7)."
        />
      </div>
      <CampoTexto nome="pasta_local" rotulo="Pasta no computador" defaultValue={obra.pasta_local ?? ""} erro={e.pasta_local} ajuda="Referência à pasta da obra; nada é copiado." />
      <CampoTexto
        nome="planilha_acoes"
        rotulo="Planilha do plano de ações"
        defaultValue={obra.planilha_acoes ?? ""}
        erro={e.planilha_acoes}
        ajuda="Caminho completo da Central de Gestão (aba AÇÕES) neste computador. O agente só lê a planilha; as ações são atualizadas nela."
      />
      <CampoAreaTexto nome="observacoes" rotulo="Observações" defaultValue={obra.observacoes ?? ""} erro={e.observacoes} />
      <BotaoEnviar>Salvar obra</BotaoEnviar>
    </form>
  );
}
