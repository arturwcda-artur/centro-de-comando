import type { Metadata } from "next";
import Link from "next/link";
import { Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { dataCivil, hojeSP } from "@/lib/formato";
import { ORDEM_SITUACAO, situacaoDaOrdem, type CodigoSituacao } from "@/lib/ordens";
import { carregarGatilhos } from "@/lib/prontidao-dados";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { conferirOrdem } from "./acoes";

export const metadata: Metadata = { title: "Controle de ordens" };

const TOM: Record<CodigoSituacao, "alerta" | "atencao" | "ok" | "neutro" | "marca"> = { vencida: "alerta", parada: "atencao", conferir: "marca", em_dia: "ok", conferida: "neutro", cancelada: "neutro" };

/**
 * Controle de ordens (Doutrina do Centro de Comando, RN-49t): o que o gestor mandou fazer, ou assumiu,
 * foi feito? Só tarefas que nasceram de uma decisão dele (Delegar ou Fazer eu).
 */
export default async function PaginaOrdens({ searchParams }: PageProps<"/ordens">) {
  const todas = (await searchParams).ver === "todas";
  const { supabase } = await exigirSessaoCompleta();
  const [{ data }, g] = await Promise.all([
    supabase
      .from("tarefas")
      .select("id, titulo, status, prazo, atualizado_em, concluida_em, ordem_tipo, ordem_em, ordem_conferida_em, obras(codigo), pessoas:responsavel_id(nome), tarefa_membros(trello_membros(nome))")
      .not("ordem_tipo", "is", null)
      .order("ordem_em", { ascending: false })
      .range(0, 999),
    carregarGatilhos(supabase),
  ]);
  const hoje = hojeSP();
  const ordens = (data ?? [])
    .map((o) => ({ ...o, situacao: situacaoDaOrdem(o, hoje, g) }))
    .filter((o) => todas || (o.situacao.codigo !== "conferida" && o.situacao.codigo !== "cancelada"))
    .sort((a, b) => ORDEM_SITUACAO[a.situacao.codigo] - ORDEM_SITUACAO[b.situacao.codigo] || (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999"));
  const contar = (c: CodigoSituacao) => ordens.filter((o) => o.situacao.codigo === c).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Controle de ordens</h1>
        <p className="text-sm text-suave">
          O que você delegou ou assumiu foi feito? {contar("vencida")} vencidas · {contar("parada")} paradas · {contar("conferir")} para conferir.
        </p>
      </div>
      <nav className="flex gap-2 text-xs">
        <Link href="/ordens" aria-current={!todas ? "page" : undefined} className={`rounded-lg border px-3 py-1.5 font-medium ${!todas ? "border-marca bg-marca-suave" : "border-borda hover:bg-superficie-2"}`}>
          Em aberto
        </Link>
        <Link href="/ordens?ver=todas" aria-current={todas ? "page" : undefined} className={`rounded-lg border px-3 py-1.5 font-medium ${todas ? "border-marca bg-marca-suave" : "border-borda hover:bg-superficie-2"}`}>
          Todas, inclusive conferidas
        </Link>
      </nav>
      <Cartao className="overflow-x-auto">
        {ordens.length === 0 ? (
          <EstadoVazio>Nenhuma ordem em aberto. Ordens nascem do Delegar e do Fazer eu, na Mesa e nas tarefas.</EstadoVazio>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-suave">
              <tr>
                <th className="py-2 pr-3 font-medium">Ordem</th>
                <th className="py-2 pr-3 font-medium">Com quem</th>
                <th className="py-2 pr-3 font-medium">Prazo</th>
                <th className="py-2 pr-3 font-medium">Situação</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {ordens.map((o) => {
                const membros = o.tarefa_membros.map((m) => m.trello_membros.nome).join(", ");
                const dono = o.ordem_tipo === "comigo" ? "Comigo" : `Delegada a ${membros || o.pessoas?.nome || "equipe"}`;
                return (
                  <tr key={o.id}>
                    <td className="py-2.5 pr-3">
                      <Link href={`/tarefas/${o.id}`} className="hover:text-marca hover:underline">
                        {o.titulo}
                      </Link>
                      <span className="block text-xs text-suave">
                        {o.obras?.codigo ?? "Sem obra"} · dada em {dataCivil(o.ordem_em)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">{dono}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{dataCivil(o.prazo)}</td>
                    <td className="py-2.5 pr-3">
                      <Etiqueta tom={TOM[o.situacao.codigo]}>{o.situacao.texto}</Etiqueta>
                    </td>
                    <td className="py-2.5 text-right">
                      {o.situacao.codigo === "conferir" && (
                        <form action={conferirOrdem.bind(null, o.id)}>
                          <button className="rounded-lg border border-borda px-3 py-1 text-xs font-medium hover:bg-superficie-2">Conferido</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Cartao>
      <p className="text-xs text-suave">
        Vencida cobra a partir de {g.ordem_vencida.limite} {g.ordem_vencida.limite === 1 ? "dia" : "dias"} de atraso; parada, após {g.ordem_parada.limite} dias sem movimento. Os limites ficam em <Link href="/gatilhos" className="underline">Gatilhos</Link>.
      </p>
    </div>
  );
}
