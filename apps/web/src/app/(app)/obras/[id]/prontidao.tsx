import { Cartao, Etiqueta } from "@/components/ui";
import { OBRAS_PILOTO, type ItemProntidao, type Situacao } from "@/lib/prontidao";
import { carregarProntidao } from "@/lib/prontidao-dados";
import { exigirSessaoCompleta } from "@/lib/sessao";

const SITUACAO: Record<Situacao, { rotulo: string; tom: "alerta" | "atencao" | "ok" | "neutro"; ordem: number }> = {
  falta: { rotulo: "Falta", tom: "alerta", ordem: 0 },
  vencido: { rotulo: "Desatualizado", tom: "atencao", ordem: 1 },
  atencao: { rotulo: "Conferir", tom: "neutro", ordem: 2 },
  ok: { rotulo: "Em ordem", tom: "ok", ordem: 3 },
};

function Linha({ i }: { i: ItemProntidao }) {
  const s = SITUACAO[i.situacao];
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="block text-sm font-medium">
          {i.titulo} <span className="text-xs font-normal text-suave">· {i.area}</span>
        </span>
        <span className="block text-xs text-suave">{i.detalhe}</span>
      </span>
      <Etiqueta tom={s.tom}>{s.rotulo}</Etiqueta>
    </li>
  );
}

/**
 * Ficha de prontidão (RN-49r): o que falta e o que está desatualizado na obra, por exceção.
 * O que está em ordem fica recolhido.
 */
export async function FichaProntidao({ obraId, codigo }: { obraId: string; codigo: string }) {
  const { supabase } = await exigirSessaoCompleta();
  const itens = await carregarProntidao(supabase, obraId);
  if (!itens) return null;
  const ordenados = [...itens].sort((a, b) => SITUACAO[a.situacao].ordem - SITUACAO[b.situacao].ordem);
  const abertos = ordenados.filter((i) => i.situacao !== "ok");
  const emOrdem = ordenados.filter((i) => i.situacao === "ok");
  const faltas = itens.filter((i) => i.situacao === "falta" || i.situacao === "vencido").length;
  const piloto = OBRAS_PILOTO.includes(codigo);

  return (
    <div id="prontidao">
      <Cartao titulo={`Prontidão da obra · ${faltas === 0 ? "nada pendente" : `${faltas} ${faltas === 1 ? "pendência" : "pendências"}`}`}>
        {abertos.length === 0 ? (
          <p className="text-sm text-suave">Tudo o que a ficha confere está em ordem.</p>
        ) : (
          <ul className="divide-y divide-borda">
            {abertos.map((i) => (
              <Linha key={i.chave} i={i} />
            ))}
          </ul>
        )}
        {emOrdem.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-suave">Em ordem ({emOrdem.length})</summary>
            <ul className="divide-y divide-borda">
              {emOrdem.map((i) => (
                <Linha key={i.chave} i={i} />
              ))}
            </ul>
          </details>
        )}
        <p className="mt-3 text-xs text-suave">
          Conferido agora com os dados do sistema. &quot;Conferir&quot; quer dizer que o documento não foi encontrado nas pastas da obra, não que falte com certeza.
          {piloto ? " Faltas e desatualizados desta obra aparecem também na Mesa." : ""}
        </p>
      </Cartao>
    </div>
  );
}
