import type { Metadata } from "next";
import Link from "next/link";
import { AlterarStatus } from "@/components/alterar-status";
import { Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { STATUS_DECISAO, STATUS_RISCO, nivelSeveridade } from "@/lib/dominio";
import { dataCivil } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Riscos e decisões" };

const COR_CELULA = (sev: number) => (sev >= 15 ? "bg-alerta-suave text-alerta" : sev >= 8 ? "bg-atencao-suave text-atencao" : "bg-ok-suave text-ok");

export default async function PaginaRiscos() {
  const { supabase } = await exigirSessaoCompleta();
  const [riscos, decisoes] = await Promise.all([
    supabase.from("riscos").select("*, obras(codigo, nome)").in("status", ["aberto", "em_tratamento"]).order("severidade", { ascending: false }),
    supabase.from("decisoes").select("*, obras(codigo, nome)").eq("status", "pendente").order("prazo", { ascending: true, nullsFirst: false }),
  ]);
  const abertos = riscos.data ?? [];
  const pendentes = decisoes.data ?? [];

  // Matriz 5×5: contagem de riscos abertos por probabilidade (linhas, 5 no topo) × impacto (colunas)
  const contagem = new Map<string, number>();
  for (const r of abertos) contagem.set(`${r.probabilidade}-${r.impacto}`, (contagem.get(`${r.probabilidade}-${r.impacto}`) ?? 0) + 1);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Riscos e decisões</h1>
        <p className="text-sm text-suave">Visão consolidada de todas as obras. Para registrar, abra a obra e use as abas Riscos ou Decisões.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Cartao titulo="Matriz de riscos abertos">
          <div className="flex gap-2">
            <span className="flex items-center text-[10px] text-suave [writing-mode:vertical-rl] rotate-180">Probabilidade →</span>
            <div className="flex-1">
              <div className="grid grid-cols-5 gap-1" role="table" aria-label="Matriz probabilidade × impacto">
                {[5, 4, 3, 2, 1].flatMap((p) =>
                  [1, 2, 3, 4, 5].map((i) => {
                    const n = contagem.get(`${p}-${i}`) ?? 0;
                    return (
                      <div
                        key={`${p}-${i}`}
                        role="cell"
                        title={`Probabilidade ${p} × impacto ${i} = ${p * i}`}
                        className={`flex aspect-square items-center justify-center rounded text-sm font-semibold ${COR_CELULA(p * i)} ${n ? "" : "opacity-40"}`}
                      >
                        {n || ""}
                      </div>
                    );
                  }),
                )}
              </div>
              <p className="mt-1 text-center text-[10px] text-suave">Impacto →</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-suave">Crítico ≥ 15 · alto 8–14 · moderado ≤ 7 (RN-50)</p>
        </Cartao>

        <Cartao titulo={`Riscos abertos (${abertos.length})`} className="lg:col-span-2">
          {abertos.length === 0 ? (
            <EstadoVazio>Nenhum risco aberto.</EstadoVazio>
          ) : (
            <ul className="divide-y divide-borda">
              {abertos.map((r) => {
                const n = nivelSeveridade(r.severidade ?? 0);
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <span className="w-10 shrink-0">
                      <Etiqueta tom={n.tom}>{r.severidade}</Etiqueta>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{r.descricao}</p>
                      <p className="text-xs text-suave">
                        {r.obras ? (
                          <Link href={`/obras/${r.obra_id}?aba=riscos`} className="hover:text-marca hover:underline">
                            {r.obras.codigo}
                          </Link>
                        ) : (
                          "Sem obra"
                        )}
                        {r.prazo && ` · até ${dataCivil(r.prazo)}`}
                      </p>
                    </div>
                    <AlterarStatus tabela="riscos" id={r.id} obraId={r.obra_id} atual={r.status} opcoes={STATUS_RISCO} />
                  </li>
                );
              })}
            </ul>
          )}
        </Cartao>
      </div>

      <Cartao titulo={`Decisões pendentes (${pendentes.length})`}>
        {pendentes.length === 0 ? (
          <EstadoVazio>Nenhuma decisão pendente.</EstadoVazio>
        ) : (
          <ul className="divide-y divide-borda">
            {pendentes.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{d.problema}</p>
                  <p className="text-xs text-suave">
                    {d.obras ? (
                      <Link href={`/obras/${d.obra_id}?aba=decisoes`} className="hover:text-marca hover:underline">
                        {d.obras.codigo}
                      </Link>
                    ) : (
                      "Sem obra"
                    )}
                    {d.prazo && ` · prazo ${dataCivil(d.prazo)}`}
                  </p>
                </div>
                <AlterarStatus tabela="decisoes" id={d.id} obraId={d.obra_id} atual={d.status} opcoes={STATUS_DECISAO} />
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
