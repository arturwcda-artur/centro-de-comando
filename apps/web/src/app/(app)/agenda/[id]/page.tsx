import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cartao } from "@/components/ui";
import { FUSO, hora, somarDias } from "@/lib/formato";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { salvarCompromisso } from "../acoes";
import { BotaoExcluir } from "../botao-excluir";
import { FormularioCompromisso } from "../formulario-compromisso";

export const metadata: Metadata = { title: "Compromisso" };

const diaSP = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date(iso));

export default async function PaginaCompromisso({ params }: PageProps<"/agenda/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await exigirSessaoCompleta();
  const [evento, obras] = await Promise.all([
    supabase.from("eventos").select("*").eq("id", id).is("cancelado_em", null).eq("calendario_externo_id", "primary").maybeSingle(),
    supabase.from("obras").select("id, codigo, nome").is("arquivado_em", null).order("codigo"),
  ]);
  const e = evento.data;
  if (!e) notFound();

  const data = diaSP(e.inicio);
  // No Google, o fim de dia inteiro é exclusivo: na tela aparece o último dia do compromisso
  const dataFim = !e.fim ? data : e.dia_inteiro ? somarDias(diaSP(e.fim), -1) : diaSP(e.fim);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/agenda" className="text-sm text-suave hover:text-texto">
          ← Agenda
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Editar compromisso</h1>
        <p className="text-sm text-suave">Em evento recorrente, a alteração vale só para esta data.</p>
      </div>
      <Cartao>
        <FormularioCompromisso
          acao={salvarCompromisso.bind(null, id)}
          compromisso={{
            titulo: e.titulo,
            data,
            data_fim: dataFim,
            dia_inteiro: e.dia_inteiro,
            inicio: e.dia_inteiro ? "" : hora(e.inicio),
            fim: e.dia_inteiro || !e.fim ? "" : hora(e.fim),
            local: e.local,
            descricao: e.descricao,
            obra_id: e.obra_id,
          }}
          obras={(obras.data ?? []).map((o) => ({ valor: o.id, rotulo: `${o.codigo} — ${o.nome}` }))}
          rotuloBotao="Salvar no Google Agenda"
        />
      </Cartao>
      <BotaoExcluir id={id} />
    </div>
  );
}
