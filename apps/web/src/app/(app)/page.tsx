import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { Aviso, Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { brl, dataCivil, dataExtensa, hora, pct } from "@/lib/formato";
import { alertasConectores } from "@/lib/integracoes";
import { carregarPainel, lerFiltros, PERIODOS } from "@/lib/painel";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Painel" };

const ROTULO_VENCIMENTO: Record<string, string> = {
  tarefa: "Tarefa",
  marco: "Marco",
  termino_contrato: "Contrato",
  recebimento_previsto: "Recebimento",
  decisao: "Decisão",
};

function Indicador({ rotulo, valor, detalhe, tom }: { rotulo: string; valor: string | number; detalhe?: string; tom?: "alerta" | "atencao" }) {
  const cor = tom === "alerta" ? "text-alerta" : tom === "atencao" ? "text-atencao" : "text-texto";
  return (
    <div className="rounded-xl border border-borda bg-superficie p-4">
      <p className="text-xs font-medium text-suave">{rotulo}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight ${cor}`}>{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-suave">{detalhe}</p>}
    </div>
  );
}

export default async function Painel({ searchParams }: PageProps<"/">) {
  const { supabase } = await exigirSessaoCompleta();
  const filtros = lerFiltros(await searchParams);
  const [p, conectores] = await Promise.all([carregarPainel(supabase, filtros), supabase.from("conectores").select("nome_exibicao, ativo, estado_conexao, ultima_sync_em, intervalo_minutos, pausado_ate")]);
  const alertas = alertasConectores(conectores.data ?? [], new Date());
  const i = p.indicadores;
  const semObras = i.total === 0;

  return (
    <div className="space-y-6">
      {alertas.length > 0 && (
        <Aviso>
          <Link href="/integracoes" className="font-medium underline">
            Integrações pedem atenção
          </Link>
          : {alertas.join(" ")}
        </Aviso>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-suave">{dataExtensa()}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Painel executivo</h1>
        </div>
        <form className="flex flex-wrap gap-2" method="get">
          <select
            name="obra"
            defaultValue={filtros.obraId ?? ""}
            aria-label="Filtrar por obra"
            className="h-9 max-w-[16rem] rounded-lg border border-borda bg-superficie px-2 text-sm"
          >
            <option value="">Todas as obras</option>
            {p.obrasParaFiltro.map((o) => (
              <option key={o.id} value={o.id}>
                {o.codigo} — {o.nome}
              </option>
            ))}
          </select>
          <select name="dias" defaultValue={filtros.dias} aria-label="Período" className="h-9 rounded-lg border border-borda bg-superficie px-2 text-sm">
            {PERIODOS.map((d) => (
              <option key={d} value={d}>
                Próximos {d} dias
              </option>
            ))}
          </select>
          <button type="submit" className="h-9 rounded-lg border border-borda bg-superficie px-3 text-sm font-medium hover:bg-superficie-2">
            Aplicar
          </button>
        </form>
      </div>

      {p.erro && <Aviso>{p.erro}</Aviso>}

      {semObras && !filtros.obraId && (
        <Aviso tipo="info">
          Nenhuma obra cadastrada ainda.{" "}
          <Link href="/obras/importar" className="font-medium underline">
            Revise as propostas lidas das suas pastas
          </Link>{" "}
          ou{" "}
          <Link href="/obras/nova" className="font-medium underline">
            cadastre uma obra
          </Link>
          .
        </Aviso>
      )}

      <section aria-label="Obras" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Indicador rotulo="Obras" valor={i.total} />
        <Indicador rotulo="Em andamento" valor={i.emAndamento} />
        <Indicador rotulo="Em planejamento" valor={i.emPlanejamento} />
        <Indicador rotulo="Próximas da conclusão" valor={i.proximasDaConclusao} detalhe="≥ 90% ou prazo em 30 dias" />
        <Indicador rotulo="Com atraso" valor={i.comAtraso} tom={i.comAtraso ? "alerta" : undefined} />
      </section>

      <section aria-label="Pendências e financeiro" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Indicador rotulo="Atividades vencidas" valor={p.tarefasVencidas} detalhe={`${p.tarefasHoje} vencem hoje`} tom={p.tarefasVencidas ? "alerta" : undefined} />
        <Indicador rotulo="Problemas críticos" valor={p.problemasCriticos} detalhe="GUT ≥ 64, em aberto" tom={p.problemasCriticos ? "atencao" : undefined} />
        <Indicador rotulo="Valor contratado" valor={brl(i.valorContratado, true)} detalhe={`Medido ${brl(i.valorMedido, true)}`} />
        <Indicador rotulo="Avanço financeiro" valor={pct(i.pctFinanceiroCarteira)} detalhe={`Recebido ${brl(i.valorRecebido, true)}`} />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Cartao titulo="Prioridades" className="lg:col-span-2" acao={<Link href="/tarefas" className="text-xs font-medium text-marca hover:underline">Todas</Link>}>
          {p.prioridades.length === 0 ? (
            <EstadoVazio>Nenhuma tarefa aberta. As tarefas do Trello e do Notion chegam na Fase 5.</EstadoVazio>
          ) : (
            <ul className="divide-y divide-borda">
              {p.prioridades.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-8 shrink-0 text-center text-xs font-semibold text-suave" title="Escore de prioridade (RN-43)">
                    {t.escore}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{t.titulo}</span>
                    {t.obra_id && <span className="block truncate text-xs text-suave">{p.nomeObra.get(t.obra_id)}</span>}
                  </span>
                  {t.vencida ? <Etiqueta tom="alerta">Vencida</Etiqueta> : t.vence_hoje ? <Etiqueta tom="atencao">Hoje</Etiqueta> : null}
                  <span className="w-20 shrink-0 text-right text-xs text-suave">{dataCivil(t.prazo)}</span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo="Compromissos de hoje" acao={<span className="text-xs text-suave">{p.eventosSemana} na semana</span>}>
          {p.eventosHoje.length === 0 ? (
            <EstadoVazio>Sem compromissos registrados hoje. A integração com o Google Agenda chega na Fase 5.</EstadoVazio>
          ) : (
            <ul className="space-y-2">
              {p.eventosHoje.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="w-12 shrink-0 font-medium tabular-nums">{e.dia_inteiro ? "Dia" : hora(e.inicio)}</span>
                  <span className="min-w-0">
                    <span className="block truncate">{e.titulo}</span>
                    {e.local && <span className="block truncate text-xs text-suave">{e.local}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo={`Próximos vencimentos (${filtros.dias} dias)`}>
          {p.vencimentos.length === 0 ? (
            <EstadoVazio>Nenhum vencimento no período.</EstadoVazio>
          ) : (
            <ul className="space-y-2">
              {p.vencimentos.map((v) => (
                <li key={`${v.tipo}-${v.registro_id}`} className="flex items-center gap-2 text-sm">
                  <CalendarClock className="size-4 shrink-0 text-suave" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{v.descricao}</span>
                  <Etiqueta>{ROTULO_VENCIMENTO[v.tipo ?? ""] ?? v.tipo}</Etiqueta>
                  <span className="w-20 shrink-0 text-right text-xs text-suave">{dataCivil(v.data)}</span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo="Problemas mais graves">
          {p.problemasGraves.length === 0 ? (
            <EstadoVazio>Nenhum problema em aberto.</EstadoVazio>
          ) : (
            <ul className="space-y-2">
              {p.problemasGraves.map((d) => (
                <li key={d.id}>
                  <Link href={`/problemas/${d.id}`} className="flex items-center gap-2 text-sm hover:text-marca">
                    <span className="w-8 shrink-0 text-xs tabular-nums text-suave">{d.gut}</span>
                    <span className="min-w-0 flex-1 truncate">{d.titulo}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo="Obras com atraso">
          {p.obrasComAtraso.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-suave">
              <CheckCircle2 className="size-4 text-ok" aria-hidden="true" /> Nenhuma obra além do prazo contratual.
            </p>
          ) : (
            <ul className="space-y-2">
              {p.obrasComAtraso.map((o) => (
                <li key={o.obra_id} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="size-4 shrink-0 text-alerta" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{o.nome}</span>
                  <Etiqueta tom="alerta">{o.dias_alem_do_prazo} dias</Etiqueta>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>

      <p className="text-xs text-suave">
        Fonte: banco do Centro de Comando (views de leitura) · calculado em {dataCivil(p.hoje)}, horário de São Paulo.
      </p>
    </div>
  );
}
