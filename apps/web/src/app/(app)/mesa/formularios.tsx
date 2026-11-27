"use client";
import { useActionState, useState } from "react";
import { BotaoEnviar, CampoAreaTexto, CampoSelecao, CampoTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import type { EstadoFormulario } from "@/lib/validacao";

type Acao = (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
type Opcao = { valor: string; rotulo: string };

/** "Decidido": registra o que foi decidido, por quem e quando (inclusive decisão tomada fora da Mesa). */
export function FormularioDecidido({ acao, pessoas, recomendacao, hoje }: { acao: Acao; pessoas: Opcao[]; recomendacao: string; hoje: string }) {
  const [estado, enviar] = useActionState(acao, {});
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="space-y-3" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <CampoAreaTexto nome="decisao" rotulo="O que foi decidido" required defaultValue={recomendacao} erro={e.decisao} />
      <CampoSelecao nome="quem" rotulo="Quem decidiu" required opcoes={[{ valor: "eu", rotulo: "Eu" }, ...pessoas]} defaultValue="eu" erro={e.quem} />
      <CampoTexto nome="quando" rotulo="Quando" type="date" required defaultValue={hoje} erro={e.quando} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="afeta_planejamento" /> Afeta cronograma ou orçamento</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="gerar_acao" /> Gerar ação a partir desta decisão</label>
      <BotaoEnviar>Decidido</BotaoEnviar>
    </form>
  );
}

/** "Não se aplica mais": o item sai da Mesa, com o motivo registrado. */
export function FormularioNaoSeAplica({ acao }: { acao: Acao }) {
  const [estado, enviar] = useActionState(acao, {});
  return (
    <form action={enviar} className="space-y-3" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <CampoAreaTexto nome="motivo" rotulo="Motivo" required erro={estado.erros?.motivo} />
      <BotaoEnviar variante="secundario">Não se aplica mais</BotaoEnviar>
    </form>
  );
}

type Quadro = { nome: string; listas: Opcao[] };

/** "Delegar": cria o cartão no quadro da equipe. Título sugerido (assunto da decisão) e descrição vazia, ambos editáveis pelo gestor. */
export function FormularioDelegar({ acao, quadros, membros, prioridades, tituloInicial }: { acao: Acao; quadros: Quadro[]; membros: Opcao[]; prioridades: readonly Opcao[]; tituloInicial: string }) {
  const [estado, enviar] = useActionState(acao, {});
  const [quadro, setQuadro] = useState("0");
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="space-y-3" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoSelecao nome="quadro" rotulo="Quadro" required opcoes={quadros.map((q, i) => ({ valor: String(i), rotulo: q.nome }))} value={quadro} onChange={(ev) => setQuadro(ev.target.value)} erro={e.quadro} />
        <CampoSelecao nome="lista" rotulo="Lista" required key={quadro} opcoes={quadros[Number(quadro)]?.listas ?? []} vazio="— selecione —" defaultValue="" erro={e.lista} />
        <CampoSelecao nome="membro" rotulo="Pessoa" required opcoes={membros} vazio="— selecione —" defaultValue="" erro={e.membro} />
        <CampoTexto nome="prazo" rotulo="Prazo" type="date" defaultValue="" erro={e.prazo} />
        <CampoSelecao nome="prioridade" rotulo="Prioridade" required opcoes={prioridades} defaultValue="media" erro={e.prioridade} />
      </div>
      <CampoTexto nome="titulo" rotulo="Título do cartão" required defaultValue={tituloInicial} erro={e.titulo} />
      <CampoAreaTexto nome="descricao" rotulo="Descrição" defaultValue="" erro={e.descricao} />
      <BotaoEnviar>Delegar</BotaoEnviar>
    </form>
  );
}
