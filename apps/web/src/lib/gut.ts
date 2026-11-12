/** Matriz GUT das ações das obras (RN-49g). Sem acesso ao banco, para poder testar. */
import { dataCivil, somarDias } from "@/lib/formato";

export type Detalhe5w2h = {
  gravidade: number | null;
  urgencia: number | null;
  tendencia: number | null;
  gut: number | null;
  o_que: string | null;
  por_que: string | null;
  onde: string | null;
  quem: string | null;
  como: string | null;
  quanto: string | null;
};

/** Mesma faixa da planilha: GUT a partir de 64 é crítico. */
export const GUT_CRITICO = 64;
export const GUT_ATENCAO = 27;
export const faixaGut = (gut: number | null) => (gut === null ? "neutro" : gut >= GUT_CRITICO ? "alerta" : gut >= GUT_ATENCAO ? "atencao" : "ok");

/** Lembrete um dia antes do prazo. Se esse dia já passou, hoje. Sem prazo, amanhã. */
export function dataSugeridaLembrete(prazo: string | null, hoje: string): string {
  if (!prazo) return somarDias(hoje, 1);
  const vespera = somarDias(prazo, -1);
  return vespera < hoje ? hoje : vespera;
}

type Acao = { titulo: string; prazo: string | null; obra: string | null; detalhe: Detalhe5w2h | null };

/** Texto do evento no Google Agenda: o 5W2H da ação, para decidir sem abrir a planilha. */
export function textoDoLembrete(a: Acao, link: string) {
  const d = a.detalhe;
  const gut = d?.gut ? ` · GUT ${d.gut}` : "";
  const linhas = [
    ["O quê", d?.o_que ?? a.titulo],
    ["Por quê", d?.por_que],
    ["Onde", d?.onde],
    ["Quando", a.prazo ? dataCivil(a.prazo) : null],
    ["Quem", d?.quem],
    ["Como", d?.como],
    ["Quanto", d?.quanto],
    ["GUT", d?.gut ? `${d.gut} (G${d.gravidade} × U${d.urgencia} × T${d.tendencia})` : null],
  ]
    .filter(([, v]) => v)
    .map(([r, v]) => `${r}: ${v}`);
  return {
    titulo: `Lembrete${a.obra ? ` ${a.obra}` : ""}${gut}: ${d?.o_que ?? a.titulo}`.slice(0, 300),
    descricao: [...linhas, "", `Ação no Centro de Comando: ${link}`].join("\n").slice(0, 4000),
  };
}
