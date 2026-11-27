/** Módulos do sistema (MASTER PROMPT §5) e a fase em que cada um é entregue. */
export type Modulo = {
  slug: string;
  href: string;
  titulo: string;
  descricao: string;
  icone:
    | "painel"
    | "dia"
    | "alertas"
    | "obras"
    | "tarefas"
    | "gut"
    | "equipe"
    | "agenda"
    | "planejamento"
    | "contratos"
    | "documentos"
    | "riscos"
    | "relatorios"
    | "integracoes"
    | "cadastros";
  fase: number;
  menu: Menu;
};

/** Os 5 itens do menu (Doutrina do Centro de Comando, 27/11/2026). Cada módulo mora em um deles. */
export type Menu = "Mesa" | "Obras" | "Agenda" | "Equipe" | "Configurações";
export const MENUS: { nome: Menu; href: string; icone: Modulo["icone"] }[] = [
  { nome: "Mesa", href: "/", icone: "painel" },
  { nome: "Obras", href: "/obras", icone: "obras" },
  { nome: "Agenda", href: "/agenda", icone: "agenda" },
  { nome: "Equipe", href: "/equipe", icone: "equipe" },
  { nome: "Configurações", href: "/configuracoes", icone: "cadastros" },
];

export const MODULOS: Modulo[] = [
  { slug: "", href: "/", titulo: "Mesa do Gestor", descricao: "Só o que precisa da sua direção", icone: "painel", fase: 3, menu: "Mesa" },
  { slug: "ordens", href: "/ordens", titulo: "Controle de ordens", descricao: "O que você delegou ou assumiu foi feito?", icone: "tarefas", fase: 3, menu: "Mesa" },
  { slug: "meu-dia", href: "/meu-dia", titulo: "Meu dia", descricao: "Prioridades, compromissos e pendências do dia", icone: "dia", fase: 5, menu: "Mesa" },
  { slug: "tarefas", href: "/tarefas", titulo: "Tarefas", descricao: "Atribuições, cobranças e vencimentos", icone: "tarefas", fase: 5, menu: "Mesa" },
  { slug: "problemas", href: "/problemas", titulo: "Problemas", descricao: "Problemas das obras pela Matriz GUT, com plano 5W2H", icone: "gut", fase: 10, menu: "Mesa" },
  { slug: "obras", href: "/obras", titulo: "Obras", descricao: "Sala de Situação e a ficha de cada obra", icone: "obras", fase: 4, menu: "Obras" },
  { slug: "painel", href: "/painel", titulo: "Painel executivo", descricao: "Visão executiva consolidada das obras", icone: "painel", fase: 3, menu: "Obras" },
  { slug: "alertas", href: "/alertas", titulo: "Alertas", descricao: "O que precisa de atenção agora", icone: "alertas", fase: 10, menu: "Obras" },
  { slug: "planejamento", href: "/planejamento", titulo: "Planejamento", descricao: "Cronogramas, linha de base e Curva S", icone: "planejamento", fase: 6, menu: "Obras" },
  { slug: "contratos", href: "/contratos", titulo: "Contratos e financeiro", descricao: "Contratos, aditivos, medições e recebimentos", icone: "contratos", fase: 7, menu: "Obras" },
  { slug: "documentos", href: "/documentos", titulo: "Documentos", descricao: "Biblioteca documental por obra", icone: "documentos", fase: 8, menu: "Obras" },
  { slug: "relatorios", href: "/relatorios", titulo: "Relatórios", descricao: "Relatórios executivos em Excel e PDF", icone: "relatorios", fase: 8, menu: "Obras" },
  { slug: "agenda", href: "/agenda", titulo: "Agenda", descricao: "Compromissos e reuniões (Google Agenda)", icone: "agenda", fase: 5, menu: "Agenda" },
  { slug: "equipe", href: "/equipe", titulo: "Equipe", descricao: "Placar oficial e desempenho da equipe", icone: "equipe", fase: 5, menu: "Equipe" },
  { slug: "configuracoes", href: "/configuracoes", titulo: "Configurações", descricao: "Gatilhos, integrações e cadastros", icone: "cadastros", fase: 3, menu: "Configurações" },
  { slug: "gatilhos", href: "/gatilhos", titulo: "Gatilhos", descricao: "O que toca o alarme e com que limite", icone: "alertas", fase: 3, menu: "Configurações" },
  { slug: "integracoes", href: "/integracoes", titulo: "Integrações", descricao: "Trello, Google, MS Project, Excel", icone: "integracoes", fase: 5, menu: "Configurações" },
  { slug: "cadastros", href: "/cadastros", titulo: "Cadastros", descricao: "Empresas, contratantes, pessoas e fornecedores", icone: "cadastros", fase: 4, menu: "Configurações" },
];

/** Última fase entregue: módulos de fases posteriores aparecem marcados como "em breve". */
export const FASE_ATUAL = 10;

export function moduloPorSlug(slug: string): Modulo | undefined {
  return MODULOS.find((m) => m.slug === slug);
}

export function moduloAtivo(caminho: string): Modulo | undefined {
  if (caminho === "/") return MODULOS[0];
  return MODULOS.find((m) => m.href !== "/" && (caminho === m.href || caminho.startsWith(`${m.href}/`)));
}
