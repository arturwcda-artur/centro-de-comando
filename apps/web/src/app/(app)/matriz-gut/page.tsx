import { redirect } from "next/navigation";

/** A Matriz GUT virou a tela Problemas (ADR 0023). Mantém os links antigos funcionando. */
export default function PaginaMatrizGut() {
  redirect("/problemas");
}
