"use client";
import { useActionState } from "react";
import { BotaoEnviar, CampoSelecao, CampoTexto } from "@/components/formulario";
import { Aviso, Etiqueta } from "@/components/ui";
import { SITUACOES_OBRA, UFS } from "@/lib/dominio";
import { aprovarProposta, descartarProposta } from "../acoes";

type Opcao = { valor: string; rotulo: string };
export type Proposta = {
  id: string;
  nome_sugerido: string;
  codigo_sugerido: string;
  situacao_sugerida: string;
  pista_contratante: string | null;
  observacao: string | null;
  provavel_nao_obra: boolean;
  pasta_local: string;
  qtd_arquivos: number;
  qtd_cronogramas: number;
  qtd_planilhas: number;
  qtd_pdfs: number;
  tamanho: string;
  ultima: string;
  estrutura_padrao: boolean;
  subpastas: string[];
};

export function CartaoProposta({ p, empresas, contratantes }: { p: Proposta; empresas: Opcao[]; contratantes: Opcao[] }) {
  const [estado, enviar] = useActionState(aprovarProposta, {});
  const e = estado.erros ?? {};
  // Contratante já cadastrado com o mesmo nome da pista? então já vem selecionado
  const contratanteSugerido = contratantes.find((c) => p.pista_contratante && c.rotulo.toLowerCase() === p.pista_contratante.toLowerCase());

  if (estado.ok) {
    return (
      <article className="rounded-xl border border-ok/30 bg-ok-suave p-4 text-sm text-ok" aria-live="polite">
        ✓ {estado.mensagem}
      </article>
    );
  }

  return (
    <article className={`rounded-xl border bg-superficie p-4 sm:p-5 ${p.provavel_nao_obra ? "border-atencao/40" : "border-borda"}`}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{p.nome_sugerido}</h2>
          <code className="block truncate text-xs text-suave" title={p.pasta_local}>
            {p.pasta_local}
          </code>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {p.provavel_nao_obra && <Etiqueta tom="atencao">Provavelmente não é obra</Etiqueta>}
          {p.estrutura_padrao ? <Etiqueta tom="ok">Pastas 01–15</Etiqueta> : <Etiqueta>Estrutura própria</Etiqueta>}
        </div>
      </header>

      <p className="mb-3 text-xs text-suave">
        {p.qtd_arquivos} arquivos · {p.qtd_cronogramas} cronogramas .mpp · {p.qtd_planilhas} planilhas · {p.qtd_pdfs} PDFs · {p.tamanho} · última alteração {p.ultima}
      </p>
      {p.observacao && <p className="mb-3 text-xs text-atencao">{p.observacao}</p>}
      {p.subpastas.length > 0 && (
        <details className="mb-3 text-xs text-suave">
          <summary className="cursor-pointer">Subpastas ({p.subpastas.length})</summary>
          <p className="mt-1">{p.subpastas.join(" · ")}</p>
        </details>
      )}

      <form action={enviar} className="space-y-3" noValidate>
        <input type="hidden" name="proposta_id" value={p.id} />
        {estado.erro && <Aviso>{estado.erro}</Aviso>}
        <div className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <CampoTexto id={`codigo-${p.id}`} nome="codigo" rotulo="Código" required defaultValue={p.codigo_sugerido} erro={e.codigo} />
          </div>
          <div className="sm:col-span-4">
            <CampoTexto id={`nome-${p.id}`} nome="nome" rotulo="Nome" required defaultValue={p.nome_sugerido} erro={e.nome} />
          </div>
          <div className="sm:col-span-2">
            <CampoSelecao id={`situacao-${p.id}`} nome="situacao" rotulo="Situação" opcoes={SITUACOES_OBRA} defaultValue={p.situacao_sugerida} erro={e.situacao} />
          </div>
          <div className="sm:col-span-3">
            <CampoTexto id={`cidade-${p.id}`} nome="cidade" rotulo="Cidade" erro={e.cidade} />
          </div>
          <CampoSelecao id={`uf-${p.id}`} nome="uf" rotulo="UF" opcoes={UFS.map((u) => ({ valor: u, rotulo: u }))} vazio="—" erro={e.uf} />
          <div className="sm:col-span-3">
            <CampoSelecao id={`empresa-${p.id}`} nome="empresa_id" rotulo="Empresa executora" opcoes={empresas} vazio="— escolher ou digitar abaixo —" erro={e.empresa_id} />
            <input
              name="nova_empresa"
              aria-label="Nova empresa"
              placeholder="ou nova empresa (ex.: L7 Construtora)"
              className="mt-1.5 h-9 w-full rounded-lg border border-borda bg-superficie-2 px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-3">
            <CampoSelecao
              id={`contratante-${p.id}`}
              nome="contratante_id"
              rotulo="Contratante"
              opcoes={contratantes}
              vazio="— escolher ou digitar abaixo —"
              defaultValue={contratanteSugerido?.valor ?? ""}
              erro={e.contratante_id}
              ajuda={p.pista_contratante && !contratanteSugerido ? `Pista pelo nome da pasta: ${p.pista_contratante}` : undefined}
            />
            <input
              name="novo_contratante"
              aria-label="Novo contratante"
              defaultValue={contratanteSugerido ? "" : (p.pista_contratante ?? "")}
              placeholder="ou novo contratante"
              className="mt-1.5 h-9 w-full rounded-lg border border-borda bg-superficie-2 px-3 text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <BotaoEnviar>Aprovar e cadastrar</BotaoEnviar>
          <BotaoEnviar variante="secundario" formAction={descartarProposta.bind(null, p.id)} formNoValidate>
            Descartar
          </BotaoEnviar>
        </div>
      </form>
    </article>
  );
}
