/** Ação 5W2H → cartão no Trello (RN-49k). Sem acesso ao banco, para poder testar. */
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

/**
 * Membro do Trello pelo nome escrito em "Quem" do 5W2H: nome igual, ou mesmo primeiro e último nome,
 * ou só o primeiro nome quando apenas um membro tem esse nome. Nulo se não houver certeza.
 */
export function membroPeloNome<T extends { id: string; nome: string }>(membros: T[], quem: string | null | undefined): string | null {
  const partes = (t: string) => normal(t).trim().split(/\s+/).filter(Boolean);
  const q = partes(quem ?? "");
  if (q.length === 0) return null;
  const unico = (lista: T[]) => (lista.length === 1 ? lista[0].id : null);
  const iguais = membros.filter((m) => partes(m.nome).join(" ") === q.join(" "));
  if (iguais.length) return unico(iguais);
  if (q.length > 1) {
    const pontas = membros.filter((m) => {
      const p = partes(m.nome);
      return p[0] === q[0] && p[p.length - 1] === q[q.length - 1];
    });
    if (pontas.length) return unico(pontas);
  }
  return unico(membros.filter((m) => partes(m.nome)[0] === q[0]));
}
