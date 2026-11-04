"use client";
import { useActionState, useEffect, useRef } from "react";
import { BotaoEnviar, CampoAreaTexto, CampoSelecao, CampoTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import { SITUACOES_ADITIVO, SITUACOES_MEDICAO, TIPOS_ADITIVO, TIPOS_LANCAMENTO } from "@/lib/dominio";
import type { EstadoFormulario } from "@/lib/validacao";

type Acao = (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;

function useLimparAoSalvar(estado: EstadoFormulario) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado]);
  return ref;
}

function Mensagens({ estado }: { estado: EstadoFormulario }) {
  return (
    <>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.mensagem && <Aviso tipo="info">{estado.mensagem}</Aviso>}
    </>
  );
}

export function FormularioAditivo({ acao }: { acao: Acao }) {
  const [estado, enviar] = useActionState(acao, {});
  const ref = useLimparAoSalvar(estado);
  const e = estado.erros ?? {};
  return (
    <form ref={ref} action={enviar} className="space-y-3" noValidate>
      <Mensagens estado={estado} />
      <div className="grid gap-3 sm:grid-cols-3">
        <CampoTexto nome="numero" rotulo="Número" required erro={e.numero} ajuda="Repetir o número atualiza o aditivo." />
        <CampoSelecao nome="tipo" rotulo="Tipo" opcoes={TIPOS_ADITIVO} erro={e.tipo} />
        <CampoSelecao nome="situacao" rotulo="Situação" opcoes={SITUACOES_ADITIVO} erro={e.situacao} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <CampoTexto nome="valor_delta" rotulo="Variação de valor (R$)" type="number" step="0.01" defaultValue="0" erro={e.valor_delta} ajuda="Supressão é negativa." />
        <CampoTexto nome="dias_delta" rotulo="Variação de prazo (dias)" type="number" defaultValue="0" erro={e.dias_delta} />
        <CampoTexto nome="data_assinatura" rotulo="Assinatura" type="date" erro={e.data_assinatura} />
      </div>
      <CampoAreaTexto nome="justificativa" rotulo="Justificativa" erro={e.justificativa} />
      <BotaoEnviar variante="secundario">Salvar aditivo</BotaoEnviar>
    </form>
  );
}

export function FormularioMedicao({ acao, medicao }: { acao: Acao; medicao: { situacao: string; data_envio: string | null; data_aprovacao: string | null; valor_glosado: number } }) {
  const [estado, enviar] = useActionState(acao, {});
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="space-y-3" noValidate>
      <Mensagens estado={estado} />
      <div className="grid gap-3 sm:grid-cols-4">
        <CampoSelecao nome="situacao" rotulo="Situação" opcoes={SITUACOES_MEDICAO} defaultValue={medicao.situacao} erro={e.situacao} />
        <CampoTexto nome="data_envio" rotulo="Envio" type="date" defaultValue={medicao.data_envio ?? ""} erro={e.data_envio} />
        <CampoTexto nome="data_aprovacao" rotulo="Aprovação" type="date" defaultValue={medicao.data_aprovacao ?? ""} erro={e.data_aprovacao} />
        <CampoTexto nome="valor_glosado" rotulo="Glosa (R$)" type="number" step="0.01" min="0" defaultValue={medicao.valor_glosado} erro={e.valor_glosado} />
      </div>
      <BotaoEnviar variante="secundario">Salvar medição</BotaoEnviar>
    </form>
  );
}

export function FormularioLancamento({ acao, medicoes }: { acao: Acao; medicoes: { valor: string; rotulo: string }[] }) {
  const [estado, enviar] = useActionState(acao, {});
  const ref = useLimparAoSalvar(estado);
  const e = estado.erros ?? {};
  return (
    <form ref={ref} action={enviar} className="space-y-3" noValidate>
      <Mensagens estado={estado} />
      <div className="grid gap-3 sm:grid-cols-3">
        <CampoSelecao nome="tipo" rotulo="Tipo" opcoes={TIPOS_LANCAMENTO} erro={e.tipo} />
        <CampoTexto nome="valor" rotulo="Valor (R$)" type="number" step="0.01" min="0" required erro={e.valor} />
        <CampoSelecao nome="medicao_id" rotulo="Medição" opcoes={medicoes} vazio="— sem medição —" erro={e.medicao_id} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <CampoTexto nome="data_prevista" rotulo="Data prevista" type="date" erro={e.data_prevista} />
        <CampoTexto nome="data_efetiva" rotulo="Data efetiva" type="date" erro={e.data_efetiva} ajuda="Só conta como faturado ou recebido com esta data." />
        <CampoTexto nome="nota_fiscal" rotulo="Nota fiscal" erro={e.nota_fiscal} />
      </div>
      <CampoTexto nome="observacoes" rotulo="Observações" erro={e.observacoes} />
      <BotaoEnviar variante="secundario">Salvar lançamento</BotaoEnviar>
    </form>
  );
}
