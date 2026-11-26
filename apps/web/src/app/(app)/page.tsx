import type { Metadata } from "next";
import { CaixaMesa } from "./mesa/caixa";
import { carregarMesa } from "@/lib/mesa-dados";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Mesa do Gestor" };

export default async function MesaDoGestor({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  const { supabase } = await exigirSessaoCompleta();
  const m = await carregarMesa(supabase, p);
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mesa do Gestor</h1>
        <p className="text-sm text-suave">Só o que precisa da sua direção no Grupo C.Salles.</p>
      </div>
      <form className="flex flex-wrap gap-2 text-sm">
        <select name="empresa" defaultValue={typeof p.empresa === "string" ? p.empresa : ""} className="rounded border border-borda px-2 py-1">
          <option value="">Grupo inteiro</option>
          {m.empresas.filter((e) => e.tipo !== "grupo").map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <select name="obra" defaultValue={m.filtro.obraId ?? ""} className="rounded border border-borda px-2 py-1">
          <option value="">Todas as obras</option>
          {m.obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <select name="area" defaultValue={m.filtro.area ?? ""} className="rounded border border-borda px-2 py-1">
          <option value="">Todas as áreas</option>
          <option value="obras">Obras e execução</option>
          <option value="compras">Compras e suprimentos</option>
          <option value="pessoas">Pessoas</option>
          <option value="financeiro">Financeiro, contratos e licitações</option>
        </select>
        <button className="rounded bg-marca px-3 py-1 text-white">Filtrar</button>
      </form>
      {m.erro && <p className="text-sm text-alerta">{m.erro}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <CaixaMesa titulo="🔴 Decidir" itens={m.caixas.decidir} nomeObra={m.nomeObra} nomeEmpresa={m.nomeEmpresa} vazio="Nada para decidir agora." />
        <CaixaMesa titulo="🟠 Aprovar" itens={m.caixas.aprovar} nomeObra={m.nomeObra} nomeEmpresa={m.nomeEmpresa} vazio="Nada aguardando aprovação." />
        <CaixaMesa titulo="🟡 Cobrar" itens={m.caixas.cobrar} nomeObra={m.nomeObra} nomeEmpresa={m.nomeEmpresa} vazio="Nenhuma entrega atrasada." />
        <CaixaMesa titulo="⚠️ Alertas" itens={m.caixas.alertas} nomeObra={m.nomeObra} nomeEmpresa={m.nomeEmpresa} vazio="Nenhum alerta." />
      </div>
    </div>
  );
}
