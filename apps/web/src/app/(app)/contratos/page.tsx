import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Cartao, EstadoVazio } from "@/components/ui";
import { brl, dataCivil } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Contratos e financeiro" };

export default async function PaginaContratos() {
  const { supabase } = await exigirSessaoCompleta();
  const [contratos, obras] = await Promise.all([supabase.from("v_contratos_resumo").select("*").order("numero"), supabase.from("obras").select("id, codigo")]);
  const codigo = new Map((obras.data ?? []).map((o) => [o.id, o.codigo]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contratos e financeiro</h1>
          <p className="text-sm text-suave">Contratado, medido, faturado e recebido, sempre separados.</p>
        </div>
        <Link href="/contratos/novo" className="inline-flex h-10 items-center gap-2 rounded-lg bg-marca px-4 text-sm font-medium text-white hover:opacity-90">
          <Plus className="size-4" aria-hidden="true" /> Novo contrato
        </Link>
      </div>
      {(contratos.data ?? []).length === 0 ? (
        <EstadoVazio>Nenhum contrato cadastrado.</EstadoVazio>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {(contratos.data ?? []).map((c) => (
            <Link key={c.contrato_id} href={`/contratos/${c.contrato_id}`} className="block">
              <Cartao className="h-full hover:bg-superficie-2">
                <h2 className="text-sm font-semibold">{c.obra_id ? codigo.get(c.obra_id) : ""}</h2>
                <p className="text-xs text-suave">
                  Contrato {c.numero} · término vigente: {dataCivil(c.data_termino_vigente)}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  {[
                    ["Contratado", c.valor_contratado],
                    ["Medido", c.valor_medido],
                    ["Saldo a medir", c.saldo_a_medir],
                    ["Recebido", c.valor_recebido],
                  ].map(([rotulo, valor]) => (
                    <div key={rotulo as string}>
                      <dt className="text-suave">{rotulo}</dt>
                      <dd className="tabular-nums">{brl(valor as number | null, true)}</dd>
                    </div>
                  ))}
                </dl>
              </Cartao>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
