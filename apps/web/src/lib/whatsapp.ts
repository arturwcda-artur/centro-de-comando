import { dataCivil } from "./formato";

/** Tarefa como entra na mensagem: só o que a pessoa precisa para agir. */
export type TarefaParaEnvio = { titulo: string | null; prazo: string | null; vencida?: boolean | null; obra?: string };

/** Máximo de tarefas numa mensagem, para o link do WhatsApp não ficar grande demais. */
export const LIMITE_TAREFAS = 40;

/** Telefone cadastrado → número no formato do WhatsApp (só dígitos, com 55). Nulo se não der para usar. */
export function numeroWhatsApp(telefone: string | null | undefined): string | null {
  const digitos = (telefone ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) return digitos;
  return null;
}

/** Mensagem com a lista de tarefas de um responsável (RN-49j). */
export function mensagemDeTarefas(nome: string, tarefas: TarefaParaEnvio[], hoje: string): string {
  const primeiro = nome.trim().split(/\s+/)[0] ?? nome;
  const linhas = tarefas.slice(0, LIMITE_TAREFAS).map((t, i) => {
    const partes = [`${i + 1}. ${t.titulo ?? "(sem título)"}`];
    if (t.obra) partes.push(t.obra);
    if (t.prazo) partes.push(`prazo ${dataCivil(t.prazo).slice(0, 5)}${t.vencida ? " (ATRASADA)" : ""}`);
    return partes.join(" — ");
  });
  const resto = tarefas.length - LIMITE_TAREFAS;
  const total = tarefas.length === 1 ? "1 tarefa" : `${tarefas.length} tarefas`;
  return [
    `Olá, ${primeiro}! Segue a sua lista de tarefas em ${dataCivil(hoje)} (${total}):`,
    "",
    ...linhas,
    ...(resto > 0 ? [`… e mais ${resto}.`] : []),
    "",
    "Qualquer dúvida ou impedimento, me avise.",
  ].join("\n");
}

/** Link que abre o WhatsApp com a mensagem escrita. Sem número, o próprio WhatsApp pede o contato. */
export function linkWhatsApp(mensagem: string, telefone?: string | null): string {
  const numero = numeroWhatsApp(telefone);
  return `https://wa.me/${numero ?? ""}?text=${encodeURIComponent(mensagem)}`;
}
