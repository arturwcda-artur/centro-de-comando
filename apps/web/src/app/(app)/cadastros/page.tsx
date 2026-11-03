import type { Metadata } from "next";
import Link from "next/link";
import { BotaoEnviar } from "@/components/formulario";
import { Cartao, EstadoVazio } from "@/components/ui";
import { carregarOpcoes } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { arquivarCadastro, type TabelaCadastro } from "./acoes";
import { FormularioCadastro } from "./formularios";

export const metadata: Metadata = { title: "Cadastros" };

const ABAS: { id: TabelaCadastro; rotulo: string; descricao: string }[] = [
  { id: "empresas", rotulo: "Empresas", descricao: "Empresas pelas quais você executa as obras." },
  { id: "contratantes", rotulo: "Contratantes", descricao: "Órgãos e clientes que contratam as obras." },
  { id: "pessoas", rotulo: "Pessoas", descricao: "Responsáveis, fiscais e equipe." },
  { id: "fornecedores", rotulo: "Fornecedores", descricao: "Fornecedores e prestadores de serviço." },
];

function formatarCnpj(c: string | null) {
  return c ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : null;
}

export default async function PaginaCadastros({ searchParams }: PageProps<"/cadastros">) {
  const pedida = (await searchParams).aba;
  const aba = ABAS.find((a) => a.id === pedida) ?? ABAS[0];
  const { supabase } = await exigirSessaoCompleta();
  const opcoes = await carregarOpcoes(supabase);

  let linhas: { id: string; titulo: string; detalhe: string }[] = [];
  if (aba.id === "empresas") {
    const { data } = await supabase.from("empresas").select("id, razao_social, nome_fantasia, cnpj").is("arquivado_em", null).order("razao_social");
    linhas = (data ?? []).map((x) => ({ id: x.id, titulo: x.razao_social, detalhe: [x.nome_fantasia, formatarCnpj(x.cnpj)].filter(Boolean).join(" · ") }));
  } else if (aba.id === "contratantes") {
    const { data } = await supabase.from("contratantes").select("id, nome, tipo, orgao, cnpj").is("arquivado_em", null).order("nome");
    linhas = (data ?? []).map((x) => ({ id: x.id, titulo: x.nome, detalhe: [x.tipo === "publico" ? "Público" : "Privado", x.orgao, formatarCnpj(x.cnpj)].filter(Boolean).join(" · ") }));
  } else if (aba.id === "pessoas") {
    const { data } = await supabase.from("pessoas").select("id, nome, funcao, email, telefone").is("arquivado_em", null).order("nome");
    linhas = (data ?? []).map((x) => ({ id: x.id, titulo: x.nome, detalhe: [x.funcao, x.email, x.telefone].filter(Boolean).join(" · ") }));
  } else {
    const { data } = await supabase.from("fornecedores").select("id, razao_social, especialidade, contato").is("arquivado_em", null).order("razao_social");
    linhas = (data ?? []).map((x) => ({ id: x.id, titulo: x.razao_social, detalhe: [x.especialidade, x.contato].filter(Boolean).join(" · ") }));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cadastros</h1>
        <p className="text-sm text-suave">{aba.descricao}</p>
      </div>
      <nav aria-label="Tipos de cadastro" className="flex gap-1 overflow-x-auto border-b border-borda">
        {ABAS.map((a) => (
          <Link
            key={a.id}
            href={`/cadastros?aba=${a.id}`}
            aria-current={a.id === aba.id ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${a.id === aba.id ? "border-marca font-medium" : "border-transparent text-suave hover:text-texto"}`}
          >
            {a.rotulo}
          </Link>
        ))}
      </nav>
      <div className="grid gap-4 lg:grid-cols-5">
        <Cartao titulo={`${aba.rotulo} (${linhas.length})`} className="lg:col-span-3">
          {linhas.length === 0 ? (
            <EstadoVazio>Nenhum cadastro ainda.</EstadoVazio>
          ) : (
            <ul className="divide-y divide-borda">
              {linhas.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.titulo}</p>
                    {l.detalhe && <p className="truncate text-xs text-suave">{l.detalhe}</p>}
                  </div>
                  <form action={arquivarCadastro.bind(null, aba.id, l.id)}>
                    <BotaoEnviar variante="secundario">Arquivar</BotaoEnviar>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
        <Cartao titulo={`Adicionar em ${aba.rotulo.toLowerCase()}`} className="lg:col-span-2">
          <FormularioCadastro key={aba.id} tabela={aba.id} empresas={opcoes.empresas} />
        </Cartao>
      </div>
    </div>
  );
}
