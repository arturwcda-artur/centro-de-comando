"use client";
import { useActionState } from "react";
import { BotaoEnviar, CampoAreaTexto, CampoSelecao, CampoTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import { GRAVIDADE, opcoesEscala, STATUS_PROBLEMA, TENDENCIA, URGENCIA } from "@/lib/problemas";
import type { EstadoFormulario } from "@/lib/validacao";

type Opcao = { valor: string; rotulo: string };
type Acao = (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;

export type ProblemaEditavel = {
  titulo?: string;
  descricao?: string | null;
  obra_id?: string | null;
  responsavel_id?: string | null;
  gravidade?: number;
  urgencia?: number;
  tendencia?: number;
  status?: string;
};

export function FormularioProblema({ acao, problema = {}, obras, pessoas }: { acao: Acao; problema?: ProblemaEditavel; obras: Opcao[]; pessoas: Opcao[] }) {
  const [estado, enviar] = useActionState(acao, {});
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="space-y-4" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <CampoTexto nome="titulo" rotulo="Problema" required defaultValue={problema.titulo ?? ""} erro={e.titulo} placeholder="Ex.: sondagem atrasada impede escolher a fundação" />
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoSelecao nome="gravidade" rotulo="Gravidade" opcoes={opcoesEscala(GRAVIDADE)} defaultValue={String(problema.gravidade ?? 3)} erro={e.gravidade} />
        <CampoSelecao nome="urgencia" rotulo="Urgência" opcoes={opcoesEscala(URGENCIA)} defaultValue={String(problema.urgencia ?? 3)} erro={e.urgencia} />
        <CampoSelecao nome="tendencia" rotulo="Tendência" opcoes={opcoesEscala(TENDENCIA)} defaultValue={String(problema.tendencia ?? 3)} erro={e.tendencia} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoSelecao nome="obra_id" rotulo="Obra" opcoes={obras} vazio="— sem obra —" defaultValue={problema.obra_id ?? ""} erro={e.obra_id} />
        <CampoSelecao nome="responsavel_id" rotulo="Responsável" opcoes={pessoas} vazio="— eu —" defaultValue={problema.responsavel_id ?? ""} erro={e.responsavel_id} />
        <CampoSelecao nome="status" rotulo="Situação" opcoes={STATUS_PROBLEMA} defaultValue={problema.status ?? "aberto"} erro={e.status} />
      </div>
      <CampoAreaTexto nome="descricao" rotulo="Detalhes" defaultValue={problema.descricao ?? ""} erro={e.descricao} />
      <BotaoEnviar>Salvar problema</BotaoEnviar>
    </form>
  );
}

export type AcaoEditavel = { o_que?: string | null; por_que?: string | null; onde?: string | null; prazo?: string | null; responsavel_id?: string | null; quem?: string | null; como?: string | null; quanto?: string | null };

export function FormularioAcao5w2h({ acao, valores = {}, pessoas, botao = "Adicionar ação" }: { acao: Acao; valores?: AcaoEditavel; pessoas: Opcao[]; botao?: string }) {
  const [estado, enviar] = useActionState(acao, {});
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="space-y-4" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <CampoTexto nome="o_que" rotulo="O quê (what)" required defaultValue={valores.o_que ?? ""} erro={e.o_que} />
      <CampoAreaTexto nome="por_que" rotulo="Por quê (why)" defaultValue={valores.por_que ?? ""} erro={e.por_que} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto nome="onde" rotulo="Onde (where)" defaultValue={valores.onde ?? ""} erro={e.onde} />
        <CampoTexto nome="prazo" rotulo="Quando (when)" type="date" defaultValue={valores.prazo ?? ""} erro={e.prazo} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelecao nome="responsavel_id" rotulo="Quem (who): pessoa cadastrada" opcoes={pessoas} vazio="— eu —" defaultValue={valores.responsavel_id ?? ""} erro={e.responsavel_id} />
        <CampoTexto nome="quem" rotulo="Quem (who): outro nome" defaultValue={valores.quem ?? ""} erro={e.quem} ajuda="Use quando a pessoa não está cadastrada." />
      </div>
      <CampoAreaTexto nome="como" rotulo="Como (how)" defaultValue={valores.como ?? ""} erro={e.como} />
      <CampoTexto nome="quanto" rotulo="Quanto (how much)" defaultValue={valores.quanto ?? ""} erro={e.quanto} placeholder="Ex.: R$ 4.500,00" />
      <BotaoEnviar>{botao}</BotaoEnviar>
    </form>
  );
}
