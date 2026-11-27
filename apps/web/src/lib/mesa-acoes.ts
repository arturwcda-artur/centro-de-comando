/** Textos e regras puras das ações da Mesa do Gestor (decidido, não se aplica mais, delegar). Sem acesso ao banco, para poder testar. */

/** "Decidido por Fulano"; sem nome, a decisão foi do próprio gestor. */
export const resultadoDecidido = (quem: string | null | undefined): string => (quem?.trim() ? `Decidido por ${quem.trim()}` : "Decidido pelo gestor");

export const resultadoNaoSeAplica = (motivo: string): string => `Não se aplica mais: ${motivo.trim()}`;

export const resultadoDelegado = (pessoa: string, quadro: string, lista: string): string => `Delegado a ${pessoa} no Trello (${quadro} › ${lista})`;

/** Decisão já tomada: o texto novo entra depois do que já estava escrito, sem apagar nada. */
export function acrescentarResultado(atual: string | null | undefined, novo: string): string {
  const base = atual?.trim().replace(/[.\s]+$/, "");
  return base ? `${base}. ${novo}` : novo;
}

/** A decisão tomada exige texto da decisão no banco; delegando uma pendente, vale o título do cartão. */
export const textoDaDecisaoAoDelegar = (decisaoAtual: string | null | undefined, tituloDoCartao: string): string => decisaoAtual?.trim() || tituloDoCartao.trim();

/** Tarefa que não se aplica mais: o motivo entra no fim da descrição, com a data, sem apagar o que havia. */
export function descricaoNaoSeAplica(descricao: string | null | undefined, motivo: string, dia: string): string {
  const linha = `${resultadoNaoSeAplica(motivo)} (${dia.split("-").reverse().join("/")})`;
  const base = descricao?.trim();
  return (base ? `${base}\n\n${linha}` : linha).slice(0, 4000);
}

/** Adiar só para frente: a nova data precisa ser depois de hoje. */
export const adiamentoValido = (data: string, hoje: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(data) && data > hoje;
