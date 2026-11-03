/** Módulos do sistema (MASTER PROMPT §5) e a fase em que cada um é entregue. */
export type Modulo = {
  slug: string;
  href: string;
  titulo: string;
  descricao: string;
  icone:
    | "painel"
    | "dia"
    | "obras"
    | "tarefas"
    | "agenda"
    | "planejamento"
    | "contratos"
    | "documentos"
    | "riscos"
    | "relatorios"
    | "integracoes"
    | "cadastros";
  fase: number;
  grupo: "Visão geral" | "Gestão" | "Controle" | "Sistema";
};

export const MODULOS: Modulo[] = [
  { slug: "", href: "/", titulo: "Painel", descricao: "Visão executiva consolidada", icone: "painel", fase: 3, grupo: "Visão geral" },
  { slug: "meu-dia", href: "/meu-dia", titulo: "Meu dia", descricao: "Prioridades, compromissos e pendências do dia", icone: "dia", fase: 5, grupo: "Visão geral" },
  { slug: "obras", href: "/obras", titulo: "Obras", descricao: "Cadastro e ambiente individual de cada obra", icone: "obras", fase: 4, grupo: "Gestão" },
  { slug: "tarefas", href: "/tarefas", titulo: "Tarefas", descricao: "Atribuições, cobranças e vencimentos", icone: "tarefas", fase: 5, grupo: "Gestão" },
  { slug: "agenda", href: "/agenda", titulo: "Agenda", descricao: "Compromissos e reuniões (Google Agenda)", icone: "agenda", fase: 5, grupo: "Gestão" },
  { slug: "planejamento", href: "/planejamento", titulo: "Planejamento", descricao: "Cronogramas, linha de base e Curva S", icone: "planejamento", fase: 6, grupo: "Controle" },
  { slug: "contratos", href: "/contratos", titulo: "Contratos e financeiro", descricao: "Contratos, aditivos, medições e recebimentos", icone: "contratos", fase: 7, grupo: "Controle" },
  { slug: "documentos", href: "/documentos", titulo: "Documentos", descricao: "Biblioteca documental por obra", icone: "documentos", fase: 8, grupo: "Controle" },
  { slug: "riscos", href: "/riscos", titulo: "Riscos e decisões", descricao: "Matriz de riscos e registro de decisões", icone: "riscos", fase: 4, grupo: "Controle" },
  { slug: "relatorios", href: "/relatorios", titulo: "Relatórios", descricao: "Relatórios executivos em Excel e PDF", icone: "relatorios", fase: 8, grupo: "Controle" },
  { slug: "cadastros", href: "/cadastros", titulo: "Cadastros", descricao: "Empresas, contratantes, pessoas e fornecedores", icone: "cadastros", fase: 4, grupo: "Sistema" },
  { slug: "integracoes", href: "/integracoes", titulo: "Integrações", descricao: "Trello, Google, Notion, MS Project, Excel", icone: "integracoes", fase: 9, grupo: "Sistema" },
];

/** Última fase entregue: módulos de fases posteriores aparecem marcados como "em breve". */
export const FASE_ATUAL = 4;

export function moduloPorSlug(slug: string): Modulo | undefined {
  return MODULOS.find((m) => m.slug === slug);
}

export function moduloAtivo(caminho: string): Modulo | undefined {
  if (caminho === "/") return MODULOS[0];
  return MODULOS.find((m) => m.href !== "/" && (caminho === m.href || caminho.startsWith(`${m.href}/`)));
}
