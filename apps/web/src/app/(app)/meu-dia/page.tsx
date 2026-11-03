import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Hourglass, Megaphone } from "lucide-react";
import { LinhaTarefa } from "@/components/linha-tarefa";
import { Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { dataCivil, dataExtensa, hojeSP, hora, limitesDoDiaSP, somarDias } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";
import type { TarefaPriorizada } from "@/lib/tarefas";
import { CapturaRapida } from "./captura-rapida";

export const metadata: Metadata = { title: "Meu dia" };

const ROTULO_VENCIMENTO: Record<string, string> = {
  tarefa: "Tarefa",
  marco: "Marco",
  termino_contrato: "Contrato",
  recebimento_previsto: "Recebimento",
  decisao: "Decisão",
};

export default async function PaginaMeuDia() {
  const { supabase } = await exigirSessaoCompleta();
  const hoje = hojeSP();
  const { inicio, fim } = limitesDoDiaSP(hoje);

  const [tarefas, eventos, vencimentos, obras, pessoas] = await Promise.all([
    supabase
      .from("v_tarefas_priorizadas")
      .select("id, titulo, prazo, escore, vencida, vence_hoje, dias_para_prazo, critica, impacto, importancia, tipo, status, fonte, obra_id, minha, aguardando_pessoa_id")
      .order("escore", { ascending: false })
      .order("prazo", { ascending: true, nullsFirst: false })
      .limit(300),
    supabase.from("eventos").select("id, titulo, inicio, fim, dia_inteiro, local, obra_id").gte("inicio", inicio).lte("inicio", fim).order("inicio"),
    supabase.from("v_vencimentos").select("tipo, registro_id, obra_id, descricao, data").gt("data", hoje).lte("data", somarDias(hoje, 7)).neq("tipo", "tarefa").order("data").limit(8),
    supabase.from("obras").select("id, codigo").is("arquivado_em", null).order("codigo"),
    supabase.from("pessoas").select("id, nome"),
  ]);

  const todas = (tarefas.data ?? []) as TarefaPriorizada[];
  const minhas = todas.filter((t) => t.minha && t.status !== "aguardando_terceiro");
  // Foco do dia: vencidas, de hoje, críticas e as de maior escore — até 8, nesta ordem de prioridade
  const foco = minhas.filter((t) => t.vencida || t.vence_hoje || t.critica || (t.escore ?? 0) >= 27).slice(0, 8);
  const proximas = minhas.filter((t) => !foco.includes(t)).slice(0, 5);
  const cobrancas = todas.filter((t) => t.tipo === "cobranca").slice(0, 6);
  const aguardando = todas.filter((t) => t.status === "aguardando_terceiro").slice(0, 6);
  const nomeObra = new Map((obras.data ?? []).map((o) => [o.id, o.codigo]));
  const nomePessoa = new Map((pessoas.data ?? []).map((p) => [p.id, p.nome]));
  const vencidas = minhas.filter((t) => t.vencida).length;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-suave">{dataExtensa()}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Meu dia</h1>
        <p className="mt-1 text-sm">
          {foco.length === 0 ? "Nada urgente para hoje." : `${foco.length} ${foco.length === 1 ? "prioridade" : "prioridades"} em foco`}
          {vencidas > 0 && <span className="text-alerta"> · {vencidas} vencida{vencidas > 1 ? "s" : ""}</span>}
          {(eventos.data ?? []).length > 0 && ` · ${(eventos.data ?? []).length} compromisso(s)`}
        </p>
      </div>

      <Cartao>
        <CapturaRapida hoje={hoje} obras={(obras.data ?? []).map((o) => ({ valor: o.id, rotulo: o.codigo }))} />
      </Cartao>

      <div className="grid gap-4 lg:grid-cols-3">
        <Cartao titulo="Foco de hoje" className="lg:col-span-2" acao={<Link href="/tarefas" className="text-xs font-medium text-marca hover:underline">Todas as tarefas</Link>}>
          {foco.length === 0 ? (
            <EstadoVazio>Sem tarefas vencidas, de hoje ou críticas. 👍</EstadoVazio>
          ) : (
            <ul className="divide-y divide-borda">
              {foco.map((t) => (
                <LinhaTarefa key={t.id} t={t} nomeObra={t.obra_id ? nomeObra.get(t.obra_id) : undefined} />
              ))}
            </ul>
          )}
          {proximas.length > 0 && (
            <>
              <p className="mb-1 mt-4 text-xs font-medium uppercase tracking-wider text-suave">Em seguida</p>
              <ul className="divide-y divide-borda">
                {proximas.map((t) => (
                  <LinhaTarefa key={t.id} t={t} nomeObra={t.obra_id ? nomeObra.get(t.obra_id) : undefined} />
                ))}
              </ul>
            </>
          )}
        </Cartao>

        <Cartao titulo="Compromissos de hoje" acao={<Link href="/agenda" className="text-xs font-medium text-marca hover:underline">Agenda</Link>}>
          {(eventos.data ?? []).length === 0 ? (
            <EstadoVazio>Nenhum compromisso registrado hoje. A leitura do Google Agenda chega na próxima etapa.</EstadoVazio>
          ) : (
            <ul className="space-y-2">
              {(eventos.data ?? []).map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="w-12 shrink-0 font-medium tabular-nums">{e.dia_inteiro ? "Dia" : hora(e.inicio)}</span>
                  <span className="min-w-0">
                    <span className="block truncate">{e.titulo}</span>
                    {(e.local || e.obra_id) && <span className="block truncate text-xs text-suave">{[e.obra_id ? nomeObra.get(e.obra_id) : null, e.local].filter(Boolean).join(" · ")}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo="Cobranças">
          {cobrancas.length === 0 ? (
            <EstadoVazio>Nenhuma cobrança aberta.</EstadoVazio>
          ) : (
            <ul className="space-y-2">
              {cobrancas.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <Megaphone className="size-4 shrink-0 text-suave" aria-hidden="true" />
                  <Link href={`/tarefas/${t.id}`} className="min-w-0 flex-1 truncate hover:text-marca">
                    {t.titulo}
                  </Link>
                  <span className="shrink-0 text-xs text-suave">{dataCivil(t.prazo)}</span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo="Aguardando terceiros">
          {aguardando.length === 0 ? (
            <EstadoVazio>Nada aguardando terceiros.</EstadoVazio>
          ) : (
            <ul className="space-y-2">
              {aguardando.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <Hourglass className="size-4 shrink-0 text-suave" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <Link href={`/tarefas/${t.id}`} className="block truncate hover:text-marca">
                      {t.titulo}
                    </Link>
                    <span className="block truncate text-xs text-suave">{t.aguardando_pessoa_id ? nomePessoa.get(t.aguardando_pessoa_id) : ""}</span>
                  </span>
                  {t.vencida && <Etiqueta tom="alerta">Atrasada</Etiqueta>}
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo="Próximos 7 dias">
          {(vencimentos.data ?? []).length === 0 ? (
            <EstadoVazio>Sem marcos, contratos, recebimentos ou decisões vencendo.</EstadoVazio>
          ) : (
            <ul className="space-y-2">
              {(vencimentos.data ?? []).map((v) => (
                <li key={`${v.tipo}-${v.registro_id}`} className="flex items-center gap-2 text-sm">
                  <CalendarClock className="size-4 shrink-0 text-suave" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{v.descricao}</span>
                  <Etiqueta>{ROTULO_VENCIMENTO[v.tipo ?? ""] ?? v.tipo}</Etiqueta>
                  <span className="shrink-0 text-xs text-suave">{dataCivil(v.data)}</span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </div>
  );
}
