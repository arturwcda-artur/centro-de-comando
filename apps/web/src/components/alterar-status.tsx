import { alterarStatus } from "@/app/(app)/obras/acoes";

/** Troca rápida de situação de um risco ou decisão (sem JavaScript obrigatório). */
export function AlterarStatus({
  tabela,
  id,
  obraId,
  atual,
  opcoes,
}: {
  tabela: "riscos" | "decisoes";
  id: string;
  obraId: string | null;
  atual: string;
  opcoes: readonly { valor: string; rotulo: string }[];
}) {
  return (
    <form action={alterarStatus} className="flex items-center gap-1.5">
      <input type="hidden" name="tabela" value={tabela} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="obra_id" value={obraId ?? ""} />
      <select name="status" defaultValue={atual} aria-label="Situação" className="h-8 rounded-md border border-borda bg-superficie-2 px-1.5 text-xs">
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      <button type="submit" className="h-8 rounded-md border border-borda px-2 text-xs hover:bg-superficie-2">
        OK
      </button>
    </form>
  );
}
