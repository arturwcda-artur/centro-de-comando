/** Ação 5W2H → cartão no Trello (RN-49k). Sem acesso ao banco, para poder testar. */
import { dataCivil } from "@/lib/formato";
import { GUT_ATENCAO, GUT_CRITICO } from "@/lib/gut";

export const PRIORIDADES = [
  { valor: "alta", rotulo: "Alta" },
  { valor: "media", rotulo: "Média" },
  { valor: "baixa", rotulo: "Baixa" },
] as const;
export type Prioridade = (typeof PRIORIDADES)[number]["valor"];

/** Prioridade sugerida pela GUT do problema: mesma faixa das cores da tela. */
export function prioridadePorGut(gut: number | null): Prioridade {
  if (gut === null) return "media";
  return gut >= GUT_CRITICO ? "alta" : gut >= GUT_ATENCAO ? "media" : "baixa";
}

const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Lista do quadro com o nome da obra (pelo código ou pelo nome). Nula se nenhuma bater. */
export function listaDaObra(listas: { id: string; nome: string }[], obra: { codigo: string; nome: string } | null): string | null {
  if (!obra) return null;
  const chaves = [obra.codigo, obra.nome].filter(Boolean).map(normal);
  return listas.find((l) => chaves.some((c) => normal(l.nome).includes(c) || c.includes(normal(l.nome))))?.id ?? null;
}

type Dados = {
  problema: string;
  gut: number | null;
  obra?: string | null;
  por_que?: string | null;
  onde?: string | null;
  como?: string | null;
  quanto?: string | null;
  prazo?: string | null;
};

/** Descrição do cartão: o problema de origem e o 5W2H, para quem não usa o sistema. */
export function descricaoDoCartao(d: Dados): string {
  const linhas: [string, string | null | undefined][] = [
    ["Por quê", d.por_que],
    ["Onde", d.onde],
    ["Como", d.como],
    ["Quanto", d.quanto],
    ["Prazo", d.prazo ? dataCivil(d.prazo) : null],
  ];
  return [
    `Problema: ${d.problema}${d.gut !== null ? ` (GUT ${d.gut})` : ""}${d.obra ? ` — ${d.obra}` : ""}`,
    "",
    ...linhas.filter(([, v]) => v).map(([r, v]) => `${r}: ${v}`),
    "",
    "Criado pelo Centro de Comando a partir do plano de ação 5W2H.",
  ].join("\n");
}
