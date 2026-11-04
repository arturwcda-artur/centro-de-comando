import { brl, dataCivil } from "@/lib/formato";
import type { PontoCurva } from "@/lib/curva-s";

export type SerieCurva = { nome: string; classe: string; pontos: PontoCurva[]; tracejada?: boolean; marcadores?: boolean };

const L = 720;
const A = 320;
const M = { esquerda: 72, direita: 12, topo: 12, base: 28 };

const dia = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/** Curva S em SVG. As cores vêm das classes de texto do tema, então funcionam no modo escuro. */
export function GraficoCurvaS({ series }: { series: SerieCurva[] }) {
  const pontos = series.flatMap((s) => s.pontos);
  if (pontos.length === 0) return null;

  const tempos = pontos.map((p) => dia(p.data));
  const t0 = Math.min(...tempos);
  const t1 = Math.max(...tempos, t0 + 86400000);
  const maximo = Math.max(...pontos.map((p) => p.valor), 1);
  const x = (iso: string) => M.esquerda + ((dia(iso) - t0) / (t1 - t0)) * (L - M.esquerda - M.direita);
  const y = (v: number) => A - M.base - (v / maximo) * (A - M.topo - M.base);

  const niveis = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maximo);
  const marcasX = [0, 0.25, 0.5, 0.75, 1].map((f) => new Date(t0 + f * (t1 - t0)).toISOString().slice(0, 10));

  return (
    <figure>
      <svg viewBox={`0 0 ${L} ${A}`} className="h-auto w-full" role="img" aria-label={`Curva S: ${series.map((s) => s.nome).join(", ")}, em reais acumulados`}>
        <g className="text-suave" fontSize="11" fill="currentColor">
          {niveis.map((v) => (
            <g key={v}>
              <line x1={M.esquerda} x2={L - M.direita} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity="0.2" />
              <text x={M.esquerda - 6} y={y(v) + 4} textAnchor="end">
                {brl(v, true)}
              </text>
            </g>
          ))}
          {marcasX.map((d, i) => (
            <text key={d} x={x(d)} y={A - 8} textAnchor={i === 0 ? "start" : i === marcasX.length - 1 ? "end" : "middle"}>
              {dataCivil(d).slice(3)}
            </text>
          ))}
        </g>
        {series.map((s) => (
          <g key={s.nome} className={s.classe}>
            <polyline
              points={s.pontos.map((p) => `${x(p.data)},${y(p.valor)}`).join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={s.tracejada ? "6 4" : undefined}
            />
            {s.marcadores && s.pontos.map((p) => <circle key={p.data} cx={x(p.data)} cy={y(p.valor)} r="3.5" fill="currentColor" />)}
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs">
        {series.map((s) => (
          <span key={s.nome} className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-0.5 w-5 bg-current ${s.classe}`} aria-hidden="true" />
            {s.nome}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
