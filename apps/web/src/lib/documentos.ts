/** Regras de exibição da tela Documentos (ADR 0018). Sem acesso ao banco, para poder testar. */
export const CATEGORIAS_DOCUMENTO = [
  { valor: "planejamento", rotulo: "Planejamento" },
  { valor: "orcamento_licitacao", rotulo: "Orçamento e licitação" },
  { valor: "contratos", rotulo: "Contratos" },
  { valor: "aditivos_reequilibrios", rotulo: "Aditivos" },
  { valor: "medicoes", rotulo: "Medições" },
  { valor: "financeiro", rotulo: "Financeiro" },
  { valor: "compras_materiais", rotulo: "Compras" },
  { valor: "projetos_tecnicos", rotulo: "Projetos" },
  { valor: "programacoes", rotulo: "Programações" },
  { valor: "atas_reunioes", rotulo: "Atas e reuniões" },
  { valor: "oficios_requerimentos", rotulo: "Ofícios" },
  { valor: "juridicos", rotulo: "Jurídicos" },
  { valor: "equipe_efetivo", rotulo: "Equipe" },
  { valor: "diario_obra", rotulo: "Diário de obra" },
  { valor: "terceirizados", rotulo: "Terceirizados" },
  { valor: "revisar", rotulo: "A revisar" },
  { valor: "outro", rotulo: "Outros" },
] as const;

export const DIAS_LEITURA_ANTIGA = 7;
export const LIMITE_BANCO_MB = 500;

type DadosAvisos = { semLink: number; digitalizados: number; erro: string | null; diasDesdeLeitura: number | null };

export function avisosDocumentos(d: DadosAvisos): string[] {
  const avisos: string[] = [];
  if (d.erro) avisos.push(`Leitura da pasta: ${d.erro}`);
  if (d.semLink > 0) avisos.push(`${d.semLink} documentos ainda sem link do Drive: use o botão Copiar caminho.`);
  if (d.digitalizados > 0) avisos.push(`${d.digitalizados} PDFs digitalizados entram na busca só pelo nome.`);
  if (d.diasDesdeLeitura !== null && d.diasDesdeLeitura > DIAS_LEITURA_ANTIGA) avisos.push(`A pasta não é lida há ${d.diasDesdeLeitura} dias.`);
  return avisos;
}

/** Divide o trecho do banco em partes, para destacar os termos sem usar HTML vindo do arquivo. */
export function partesDoTrecho(trecho: string): { texto: string; destaque: boolean }[] {
  return trecho
    .split(/(«[^»]*»)/)
    .filter(Boolean)
    .map((p) => (p.startsWith("«") ? { texto: p.slice(1, -1), destaque: true } : { texto: p, destaque: false }));
}

export function espacoUsado(bytes: number | null): string | null {
  if (bytes === null) return null;
  const mb = bytes / 1024 / 1024;
  return `${mb.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} MB de ${LIMITE_BANCO_MB} MB (${Math.round((mb / LIMITE_BANCO_MB) * 100)}%)`;
}
