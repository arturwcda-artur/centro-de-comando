import { listasDoQuadroPorNome } from "@cc/integrations/src/escrita.js";
import { adiarItem, decidirItem, delegarParaEquipe, naoSeAplicaItem } from "./acoes";
import { FormularioDecidido, FormularioDelegar, FormularioNaoSeAplica } from "./formularios";
import { Aviso, Cartao } from "@/components/ui";
import { PRIORIDADES } from "@/lib/cartao-acao";
import { QUADROS_EQUIPE } from "@/lib/equipe";
import { hojeSP } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";

/** Listas de cada quadro da equipe, só leitura. */
export async function lerQuadros(): Promise<{ quadros: { nome: string; listas: { valor: string; rotulo: string }[] }[]; falha: string | null }> {
  const { TRELLO_API_KEY, TRELLO_TOKEN } = process.env;
  if (!TRELLO_API_KEY || !TRELLO_TOKEN) return { quadros: [], falha: "Não foi possível ler o Trello agora." };
  try {
    const cred = { chave: TRELLO_API_KEY, token: TRELLO_TOKEN };
    const listas = await Promise.all(QUADROS_EQUIPE.map((q) => listasDoQuadroPorNome(cred, q)));
    return { quadros: QUADROS_EQUIPE.map((nome, i) => ({ nome, listas: listas[i].map((l) => ({ valor: l.id, rotulo: l.nome })) })), falha: null };
  } catch {
    return { quadros: [], falha: "Não foi possível ler o Trello agora." };
  }
}

export async function DetalheItem({ decisaoId, delegar }: { decisaoId: string; delegar?: boolean }) {
  const { supabase } = await exigirSessaoCompleta();
  const [{ data: d }, { data: pessoas }, { data: membros }, { quadros, falha }] = await Promise.all([
    supabase.from("decisoes").select("id, status, problema, recomendacao, principio, impacto, prazo").eq("id", decisaoId).maybeSingle(),
    supabase.from("pessoas").select("id, nome").is("arquivado_em", null).eq("eh_usuario", false).order("nome"),
    supabase.from("trello_membros").select("id, nome, pessoa_id").not("pessoa_id", "is", null).order("nome"),
    lerQuadros(),
  ]);
  if (!d) return null;
  const pendente = d.status === "pendente";
  const podeDelegar = pendente || d.status === "tomada";
  return (
    <Cartao titulo={d.problema}>
      <dl className="space-y-1 text-sm">
        {d.recomendacao && <div><dt className="inline font-semibold">Recomendação: </dt><dd className="inline">{d.recomendacao}</dd></div>}
        {d.principio && <div><dt className="inline font-semibold">Por quê: </dt><dd className="inline">{d.principio}</dd></div>}
        {d.impacto && <div><dt className="inline font-semibold">Impacto: </dt><dd className="inline">{d.impacto}</dd></div>}
      </dl>
      <div className="mt-3 grid gap-4 md:grid-cols-2 text-sm">
        {pendente && (
          <>
            <section><h3 className="mb-2 font-semibold">Decidido</h3><FormularioDecidido acao={decidirItem.bind(null, d.id)} pessoas={(pessoas ?? []).map((p) => ({ valor: p.id, rotulo: p.nome }))} recomendacao={d.recomendacao ?? ""} hoje={hojeSP()} /></section>
            <section><h3 className="mb-2 font-semibold">Não se aplica mais</h3><FormularioNaoSeAplica acao={naoSeAplicaItem.bind(null, d.id)} /></section>
          </>
        )}
        {podeDelegar && (
          <section className={delegar ? "md:col-span-2" : ""}>
            <h3 className="mb-2 font-semibold">Delegar para a equipe</h3>
            {falha ? (
              <Aviso>{falha}</Aviso>
            ) : (
              <FormularioDelegar acao={delegarParaEquipe.bind(null, d.id)} quadros={quadros} membros={(membros ?? []).map((m) => ({ valor: m.id, rotulo: m.nome }))} prioridades={PRIORIDADES.map((p) => ({ valor: p.valor, rotulo: p.rotulo }))} tituloInicial={d.problema.slice(0, 300)} />
            )}
          </section>
        )}
        {pendente && (
          <form action={adiarItem.bind(null, d.id)} className="space-y-1">
            <h3 className="font-semibold">Adiar</h3>
            <input type="date" name="adiar_ate" required className="w-full rounded border border-borda p-1" />
            <button className="rounded border border-borda px-3 py-1">Adiar</button>
          </form>
        )}
      </div>
    </Cartao>
  );
}
