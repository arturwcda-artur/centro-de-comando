import type { Metadata } from "next";
import Link from "next/link";
import { Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { dataHora } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Planejamento" };

export default async function PaginaPlanejamento() {
  const { supabase } = await exigirSessaoCompleta();
  const { data } = await supabase.from("cronograma_arquivos").select("obra_id, ultima_leitura_em, ultimo_erro, obras(codigo, nome)").order("obra_id");

  const porObra = new Map<string, { codigo: string; nome: string; leitura: string | null; erros: number; arquivos: number }>();
  for (const a of data ?? []) {
    const atual = porObra.get(a.obra_id) ?? { codigo: a.obras.codigo, nome: a.obras.nome, leitura: null, erros: 0, arquivos: 0 };
    atual.arquivos += 1;
    if (a.ultimo_erro) atual.erros += 1;
    if (a.ultima_leitura_em && (!atual.leitura || a.ultima_leitura_em > atual.leitura)) atual.leitura = a.ultima_leitura_em;
    porObra.set(a.obra_id, atual);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Planejamento</h1>
        <p className="text-sm text-suave">Cronogramas lidos do MS Project, sem alterar os arquivos.</p>
      </div>
      {porObra.size === 0 ? (
        <EstadoVazio>Nenhuma obra com cronograma cadastrado.</EstadoVazio>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...porObra.entries()].map(([id, o]) => (
            <Link key={id} href={`/planejamento/${id}`} className="block">
              <Cartao className="h-full hover:bg-superficie-2">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold">{o.codigo}</h2>
                  {o.erros > 0 && <Etiqueta tom="alerta">{o.erros} com erro</Etiqueta>}
                </div>
                <p className="mt-1 text-xs text-suave">
                  {o.arquivos} arquivos · última leitura: {dataHora(o.leitura)}
                </p>
              </Cartao>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
