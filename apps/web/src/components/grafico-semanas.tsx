import { dataCivil } from "@/lib/formato";

/** Entraram e resolvidas, semana a semana: mostra se a equipe está dando conta. */
export function GraficoSemanas({ semanas }: { semanas: { inicio: string; entraram: number; resolvidas: number }[] }) {
  const maior = Math.max(...semanas.flatMap((s) => [s.entraram, s.resolvidas]), 1);
  const barra = (n: number, cor: string, rotulo: string) => <span title={`${rotulo}: ${n}`} className={`w-1/2 rounded-t ${cor}`} style={{ height: `${(n / maior) * 100}%`, minHeight: n ? "2px" : 0 }} />;
  return (
    <div>
      <ul className="flex h-36 items-end gap-2" aria-label="Tarefas que entraram e que foram resolvidas por semana">
        {semanas.map((s) => (
          <li key={s.inicio} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] tabular-nums text-suave">{`${s.entraram} / ${s.resolvidas}`}</span>
            <span className="flex min-h-0 w-full flex-1 items-end gap-0.5">
              {barra(s.entraram, "bg-borda", "Entraram")}
              {barra(s.resolvidas, "bg-marca", "Resolvidas")}
            </span>
            <span className="text-[10px] tabular-nums text-suave">{dataCivil(s.inicio).slice(0, 5)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-borda" aria-hidden="true" /> Entraram
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-marca" aria-hidden="true" /> Resolvidas
        </span>
      </p>
    </div>
  );
}
