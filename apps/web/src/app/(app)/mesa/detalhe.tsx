import { adiarItem, decidirItem, delegarItem } from "./acoes";
import { FormularioDecidido } from "./formularios";
import { Cartao } from "@/components/ui";
import { hojeSP } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";

export async function DetalheItem({ decisaoId }: { decisaoId: string }) {
  const { supabase } = await exigirSessaoCompleta();
  const [{ data: d }, { data: pessoas }] = await Promise.all([
    supabase.from("decisoes").select("id, problema, recomendacao, principio, impacto, prazo").eq("id", decisaoId).maybeSingle(),
    supabase.from("pessoas").select("id, nome").is("arquivado_em", null).eq("eh_usuario", false).order("nome"),
  ]);
  if (!d) return null;
  return (
    <Cartao titulo={d.problema}>
      <dl className="space-y-1 text-sm">
        {d.recomendacao && <div><dt className="inline font-semibold">Recomendação: </dt><dd className="inline">{d.recomendacao}</dd></div>}
        {d.principio && <div><dt className="inline font-semibold">Por quê: </dt><dd className="inline">{d.principio}</dd></div>}
        {d.impacto && <div><dt className="inline font-semibold">Impacto: </dt><dd className="inline">{d.impacto}</dd></div>}
      </dl>
      <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
        <FormularioDecidido acao={decidirItem.bind(null, d.id)} pessoas={(pessoas ?? []).map((p) => ({ valor: p.id, rotulo: p.nome }))} recomendacao={d.recomendacao ?? ""} hoje={hojeSP()} />
        <form action={delegarItem.bind(null, d.id)} className="space-y-1">
          <select name="responsavel_id" required className="w-full rounded border border-borda p-1">
            {(pessoas ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <input type="date" name="prazo" className="w-full rounded border border-borda p-1" />
          <button className="rounded border border-borda px-3 py-1">Delegar</button>
        </form>
        <form action={adiarItem.bind(null, d.id)} className="space-y-1">
          <input type="date" name="adiar_ate" required className="w-full rounded border border-borda p-1" />
          <button className="rounded border border-borda px-3 py-1">Adiar</button>
        </form>
      </div>
    </Cartao>
  );
}
