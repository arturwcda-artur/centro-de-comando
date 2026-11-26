import Link from "next/link";
import { Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { dataCivil } from "@/lib/formato";
import type { ItemMesa } from "@/lib/mesa";

const NOME_AREA = { obras: "Obras", compras: "Compras", pessoas: "Pessoas", financeiro: "Financeiro" } as const;

export function CaixaMesa({ titulo, itens, nomeObra, nomeEmpresa, vazio }: { titulo: string; itens: ItemMesa[]; nomeObra: Map<string, string>; nomeEmpresa: Map<string, string>; vazio: string }) {
  return (
    <Cartao titulo={`${titulo} (${itens.length})`}>
      {itens.length === 0 ? <EstadoVazio>{vazio}</EstadoVazio> : (
        <ul className="divide-y divide-borda">
          {itens.map((i) => (
            <li key={i.chave}>
              <Link href={i.href} className="block py-2.5 text-sm hover:text-marca">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium">{i.titulo}</span>
                  {i.prazo && <Etiqueta tom={i.gravidade >= 3 ? "alerta" : "atencao"}>{dataCivil(i.prazo)}</Etiqueta>}
                </div>
                <div className="mt-0.5 text-xs text-suave">
                  {[i.empresaId ? nomeEmpresa.get(i.empresaId) : null, i.obraId ? nomeObra.get(i.obraId) : null, NOME_AREA[i.area], i.responsavel].filter(Boolean).join(" · ")}
                </div>
                {i.recomendacao && <div className="mt-1 text-xs"><strong>Recomendação:</strong> {i.recomendacao}</div>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
