import type { Metadata } from "next";
import Link from "next/link";
import { Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { dataCivil } from "@/lib/formato";
import { faixaGut, type Detalhe5w2h } from "@/lib/gut";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Matriz GUT" };

const NUMERO = "py-2.5 text-center tabular-nums";

export default async function PaginaMatrizGut({ searchParams }: { searchParams: Promise<{ obra?: string }> }) {
  const { supabase } = await exigirSessaoCompleta();
  const { obra } = await searchParams;
  const obraId = obra && UUID.test(obra) ? obra : null;

  let consulta = supabase
    .from("tarefas")
    .select("id, titulo, prazo, status, obra_id, obras(codigo), acoes_detalhes(*)")
    .eq("fonte", "planilha")
    .not("status", "in", "(concluida,cancelada)");
  if (obraId) consulta = consulta.eq("obra_id", obraId);
  const [{ data, error }, obras] = await Promise.all([consulta, supabase.from("acoes_planilhas").select("obra_id, obras(codigo, nome)")]);
  if (error) throw new Error(error.message);

  // Maior GUT primeiro; sem nota no fim; empate pelo prazo mais próximo
  const acoes = (data ?? [])
    .map((t) => ({ ...t, detalhe: t.acoes_detalhes as Detalhe5w2h | null }))
    .sort((a, b) => (b.detalhe?.gut ?? -1) - (a.detalhe?.gut ?? -1) || (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999"));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Matriz GUT</h1>
        <p className="text-sm text-suave">Ações em aberto das obras, da mais grave para a menos grave. A fonte é a planilha da Central de Gestão de cada obra.</p>
      </div>

      <nav aria-label="Obra" className="flex flex-wrap gap-2">
        {[{ obra_id: null, obras: { codigo: "Todas", nome: "" } }, ...(obras.data ?? [])].map((o) => (
          <Link
            key={o.obra_id ?? "todas"}
            href={o.obra_id ? `/matriz-gut?obra=${o.obra_id}` : "/matriz-gut"}
            aria-current={o.obra_id === obraId ? "page" : undefined}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${o.obra_id === obraId ? "border-marca bg-marca-suave" : "border-borda hover:bg-superficie-2"}`}
          >
            {o.obras?.codigo}
          </Link>
        ))}
      </nav>

      <Cartao>
        {acoes.length === 0 ? (
          <EstadoVazio>Nenhuma ação em aberto. Cadastre a planilha da Central de Gestão em Obras › Editar.</EstadoVazio>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-suave">
                <tr>
                  <th className="py-2 font-medium">GUT</th>
                  <th className="py-2 text-center font-medium" title="Gravidade">G</th>
                  <th className="py-2 text-center font-medium" title="Urgência">U</th>
                  <th className="py-2 text-center font-medium" title="Tendência">T</th>
                  <th className="py-2 font-medium">Ação</th>
                  <th className="py-2 font-medium">Quem</th>
                  <th className="py-2 text-right font-medium">Prazo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {acoes.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5">
                      <Etiqueta tom={faixaGut(a.detalhe?.gut ?? null)}>{a.detalhe?.gut ?? "—"}</Etiqueta>
                    </td>
                    <td className={NUMERO}>{a.detalhe?.gravidade ?? "—"}</td>
                    <td className={NUMERO}>{a.detalhe?.urgencia ?? "—"}</td>
                    <td className={NUMERO}>{a.detalhe?.tendencia ?? "—"}</td>
                    <td className="max-w-md py-2.5 pr-3">
                      <Link href={`/matriz-gut/${a.id}`} className="block truncate hover:text-marca hover:underline">
                        {a.detalhe?.o_que ?? a.titulo}
                      </Link>
                      <span className="text-xs text-suave">{a.obras?.codigo}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs">{a.detalhe?.quem ?? "—"}</td>
                    <td className="py-2.5 text-right text-xs tabular-nums">{dataCivil(a.prazo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </div>
  );
}
