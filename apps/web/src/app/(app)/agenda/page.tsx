import type { Metadata } from "next";
import { Aviso, Cartao, EstadoVazio } from "@/components/ui";
import { dataCivil, hojeSP, hora, limitesDoDiaSP, somarDias } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Agenda" };

const DIA_SEMANA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long" });

export default async function PaginaAgenda() {
  const { supabase } = await exigirSessaoCompleta();
  const hoje = hojeSP();
  const ate = somarDias(hoje, 13);
  const [eventos, obras, conector] = await Promise.all([
    supabase.from("eventos").select("id, titulo, inicio, fim, dia_inteiro, local, obra_id, fonte").is("cancelado_em", null).gte("inicio", limitesDoDiaSP(hoje).inicio).lte("inicio", limitesDoDiaSP(ate).fim).order("inicio"),
    supabase.from("obras").select("id, codigo"),
    supabase.from("conectores").select("ultima_sync_em, ativo").eq("ferramenta", "google_agenda").maybeSingle(),
  ]);
  const nomeObra = new Map((obras.data ?? []).map((o) => [o.id, o.codigo]));

  // Agrupa por dia civil em São Paulo
  const porDia = new Map<string, NonNullable<typeof eventos.data>>();
  for (const e of eventos.data ?? []) {
    const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(e.inicio));
    porDia.set(dia, [...(porDia.get(dia) ?? []), e]);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
        <p className="text-sm text-suave">Próximos 14 dias · horário de São Paulo</p>
      </div>
      {!conector.data?.ativo && (
        <Aviso tipo="info">
          A leitura do Google Agenda (somente leitura, sem alterar sua agenda) é ativada na próxima etapa da Fase 5.
        </Aviso>
      )}
      {porDia.size === 0 ? (
        <EstadoVazio>Nenhum compromisso registrado nos próximos 14 dias.</EstadoVazio>
      ) : (
        <div className="space-y-3">
          {[...porDia.entries()].map(([dia, lista]) => (
            <Cartao key={dia} titulo={`${dia === hoje ? "Hoje" : DIA_SEMANA.format(new Date(`${dia}T12:00:00-03:00`))} · ${dataCivil(dia)}`}>
              <ul className="space-y-2">
                {lista.map((e) => (
                  <li key={e.id} className="flex gap-3 text-sm">
                    <span className="w-24 shrink-0 tabular-nums text-suave">{e.dia_inteiro ? "Dia inteiro" : `${hora(e.inicio)}${e.fim ? `–${hora(e.fim)}` : ""}`}</span>
                    <span className="min-w-0">
                      <span className="block truncate">{e.titulo}</span>
                      {(e.local || e.obra_id) && <span className="block truncate text-xs text-suave">{[e.obra_id ? nomeObra.get(e.obra_id) : null, e.local].filter(Boolean).join(" · ")}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Cartao>
          ))}
        </div>
      )}
    </div>
  );
}
