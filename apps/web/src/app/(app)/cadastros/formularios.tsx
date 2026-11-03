"use client";
import { useActionState, useEffect, useRef } from "react";
import { BotaoEnviar, CampoSelecao, CampoTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import { salvarCadastro, type TabelaCadastro } from "./acoes";

type Opcao = { valor: string; rotulo: string };

export function FormularioCadastro({ tabela, empresas }: { tabela: TabelaCadastro; empresas: Opcao[] }) {
  const [estado, enviar] = useActionState(salvarCadastro.bind(null, tabela), {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado]);
  const e = estado.erros ?? {};

  return (
    <form ref={ref} action={enviar} className="space-y-3" noValidate>
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.mensagem && <Aviso tipo="info">{estado.mensagem}</Aviso>}
      {tabela === "empresas" && (
        <>
          <CampoTexto nome="razao_social" rotulo="Razão social" required erro={e.razao_social} />
          <CampoTexto nome="nome_fantasia" rotulo="Nome fantasia" erro={e.nome_fantasia} />
          <CampoTexto nome="cnpj" rotulo="CNPJ" inputMode="numeric" erro={e.cnpj} />
        </>
      )}
      {tabela === "contratantes" && (
        <>
          <CampoTexto nome="nome" rotulo="Nome" required erro={e.nome} />
          <CampoSelecao nome="tipo" rotulo="Tipo" opcoes={[{ valor: "publico", rotulo: "Público" }, { valor: "privado", rotulo: "Privado" }]} erro={e.tipo} />
          <CampoTexto nome="orgao" rotulo="Órgão / unidade" erro={e.orgao} />
          <CampoTexto nome="cnpj" rotulo="CNPJ" inputMode="numeric" erro={e.cnpj} />
        </>
      )}
      {tabela === "pessoas" && (
        <>
          <CampoTexto nome="nome" rotulo="Nome" required erro={e.nome} />
          <CampoTexto nome="funcao" rotulo="Função" erro={e.funcao} placeholder="Engenheiro, fiscal, mestre…" />
          <CampoSelecao nome="empresa_id" rotulo="Empresa" opcoes={empresas} vazio="—" erro={e.empresa_id} />
          <CampoTexto nome="email" rotulo="E-mail" type="email" erro={e.email} />
          <CampoTexto nome="telefone" rotulo="Telefone" erro={e.telefone} />
        </>
      )}
      {tabela === "fornecedores" && (
        <>
          <CampoTexto nome="razao_social" rotulo="Razão social" required erro={e.razao_social} />
          <CampoTexto nome="nome_fantasia" rotulo="Nome fantasia" erro={e.nome_fantasia} />
          <CampoTexto nome="cnpj" rotulo="CNPJ" inputMode="numeric" erro={e.cnpj} />
          <CampoTexto nome="especialidade" rotulo="Especialidade" erro={e.especialidade} />
          <CampoTexto nome="contato" rotulo="Contato" erro={e.contato} />
        </>
      )}
      <BotaoEnviar>Adicionar</BotaoEnviar>
    </form>
  );
}
