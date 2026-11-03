import type { Metadata } from "next";
import Link from "next/link";
import { BotaoEnviar } from "@/components/formulario";
import { Aviso, Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { SITUACOES_OBRA } from "@/lib/dominio";
import { dataCivil } from "@/lib/formato";
import { carregarOpcoes } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { reabrirProposta } from "../acoes";
import { CartaoProposta } from "./cartao-proposta";

export const metadata: Metadata = { title: "Importação assistida" };

function tamanho(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1).replace(".", ",")} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default async function PaginaImportacao() {
  const { supabase } = await exigirSessaoCompleta();
  const [propostas, opcoes] = await Promise.all([
    supabase.from("importacao_obras").select("*").order("situacao_sugerida").order("nome_sugerido"),
    carregarOpcoes(supabase),
  ]);
  const todas = propostas.data ?? [];
  const pendentes = todas.filter((p) => p.status === "pendente");
  const revisadas = todas.filter((p) => p.status !== "pendente");
  const ordem = SITUACOES_OBRA.map((s) => s.valor) as string[];
  pendentes.sort((a, b) => ordem.indexOf(a.situacao_sugerida) - ordem.indexOf(b.situacao_sugerida) || a.nome_sugerido.localeCompare(b.nome_sugerido));

  return (
    <div className="space-y-5">
      <div>
        <Link href="/obras" className="text-sm text-suave hover:text-texto">
          ← Obras
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Importação assistida</h1>
        <p className="mt-1 max-w-3xl text-sm text-suave">
          Propostas lidas das pastas de obras do seu computador (somente leitura). Confira e corrija cada uma: só vira
          obra o que você aprovar. Empresa e contratante podem ser escolhidos ou digitados.
        </p>
      </div>

      {todas.length === 0 && (
        <Aviso tipo="info">
          Nenhuma proposta carregada ainda. O agente local lê as pastas com <code>py -m cc_agente.inventario_obras</code>{" "}
          (ver docs/DEPLOYMENT.md).
        </Aviso>
      )}

      {pendentes.length > 0 && (
        <p className="text-sm">
          <strong>{pendentes.length}</strong> {pendentes.length === 1 ? "proposta aguardando" : "propostas aguardando"} revisão.
        </p>
      )}
      <div className="space-y-4">
        {pendentes.map((p) => (
          <CartaoProposta
            key={p.id}
            empresas={opcoes.empresas}
            contratantes={opcoes.contratantes}
            p={{
              ...p,
              tamanho: tamanho(Number(p.tamanho_bytes)),
              ultima: p.ultima_modificacao ? dataCivil(p.ultima_modificacao.slice(0, 10)) : "—",
            }}
          />
        ))}
      </div>
      {todas.length > 0 && pendentes.length === 0 && <EstadoVazio>Todas as propostas foram revisadas.</EstadoVazio>}

      {revisadas.length > 0 && (
        <Cartao titulo={`Revisadas (${revisadas.length})`}>
          <ul className="divide-y divide-borda">
            {revisadas.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{p.nome_sugerido}</span>
                {p.status === "aprovada" ? (
                  <Link href={`/obras/${p.obra_id}`} className="text-xs font-medium text-marca hover:underline">
                    Ver obra
                  </Link>
                ) : (
                  <>
                    <Etiqueta>Descartada</Etiqueta>
                    <form action={reabrirProposta.bind(null, p.id)}>
                      <BotaoEnviar variante="secundario">Reabrir</BotaoEnviar>
                    </form>
                  </>
                )}
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  );
}
