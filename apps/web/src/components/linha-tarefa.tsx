import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { reabrirTarefa } from "@/app/(app)/tarefas/acoes";
import { BotaoConcluir } from "@/components/botao-concluir";
import { Etiqueta } from "@/components/ui";
import { motivosPrioridade, podeConcluir, rotuloDe, STATUS_TAREFA, TIPOS_TAREFA } from "@/lib/dominio";
import { dataCivil } from "@/lib/formato";

export type LinhaTarefaDados = {
  id: string | null;
  titulo: string | null;
  prazo: string | null;
  escore?: number | null;
  vencida?: boolean | null;
  vence_hoje?: boolean | null;
  dias_para_prazo?: number | null;
  critica?: boolean | null;
  impacto?: number | null;
  importancia?: number | null;
  tipo: string | null;
  status: string | null;
  fonte: string | null;
  responsavel_id?: string | null;
  obra_id: string | null;
  concluida_em?: string | null;
};

/** Uma tarefa na lista: escore, motivos da prioridade, obra, prazo e ação rápida de concluir/reabrir. */
export function LinhaTarefa({ t, nomeObra, mostrarMotivos = true }: { t: LinhaTarefaDados; nomeObra?: string; mostrarMotivos?: boolean }) {
  if (!t.id) return null;
  const concluida = t.status === "concluida";
  const manual = t.fonte === "manual";
  const motivos = mostrarMotivos && !concluida ? motivosPrioridade(t) : [];
  return (
    <li className="flex items-center gap-3 py-2.5">
      {concluida && manual ? (
        <form action={reabrirTarefa.bind(null, t.id)}>
          <button
            type="submit"
            title="Reabrir"
            aria-label={`Reabrir: ${t.titulo}`}
            className="inline-flex size-7 items-center justify-center rounded-full border border-ok bg-ok-suave text-ok transition"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </form>
      ) : podeConcluir(t) ? (
        <BotaoConcluir id={t.id} titulo={t.titulo} />
      ) : (
        <span className="inline-flex size-7 items-center justify-center text-[10px] text-suave" title={concluida ? `Concluída no ${t.fonte}` : "Tarefa de terceiros: só leitura"}>
          {t.fonte?.slice(0, 2).toUpperCase()}
        </span>
      )}
      {t.escore !== undefined && t.escore !== null && !concluida && (
        <span className="w-7 shrink-0 text-center text-xs font-semibold text-suave" title="Escore de prioridade (RN-43)">
          {t.escore}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <Link href={`/tarefas/${t.id}`} className={`block truncate text-sm hover:text-marca ${concluida ? "text-suave line-through" : ""}`}>
          {t.titulo}
        </Link>
        <span className="block truncate text-xs text-suave">
          {[nomeObra, t.tipo !== "acao" ? rotuloDe(TIPOS_TAREFA, t.tipo) : null, t.status === "aguardando_terceiro" ? rotuloDe(STATUS_TAREFA, t.status) : null, ...motivos]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      {t.vencida && !concluida ? <Etiqueta tom="alerta">Vencida</Etiqueta> : t.vence_hoje && !concluida ? <Etiqueta tom="atencao">Hoje</Etiqueta> : null}
      <span className="w-20 shrink-0 text-right text-xs tabular-nums text-suave">{concluida ? dataCivil(t.concluida_em?.slice(0, 10)) : dataCivil(t.prazo)}</span>
    </li>
  );
}
