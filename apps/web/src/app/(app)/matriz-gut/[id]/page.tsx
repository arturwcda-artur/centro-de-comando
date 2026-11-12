import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cartao, Etiqueta } from "@/components/ui";
import { hojeSP, dataCivil } from "@/lib/formato";
import { dataSugeridaLembrete, faixaGut, type Detalhe5w2h } from "@/lib/gut";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { FormularioLembrete } from "./formulario-lembrete";

export const metadata: Metadata = { title: "Ação da Matriz GUT" };

export default async function PaginaAcaoGut({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await exigirSessaoCompleta();
  const { data: t } = await supabase.from("tarefas").select("id, titulo, prazo, status, obras(codigo, nome), acoes_detalhes(*)").eq("id", id).eq("fonte", "planilha").maybeSingle();
  if (!t) notFound();
  const d = t.acoes_detalhes as Detalhe5w2h | null;

  const linhas: [string, string | null][] = [
    ["O quê", d?.o_que ?? t.titulo],
    ["Por quê", d?.por_que ?? null],
    ["Onde", d?.onde ?? null],
    ["Quando", t.prazo ? dataCivil(t.prazo) : null],
    ["Quem", d?.quem ?? null],
    ["Como", d?.como ?? null],
    ["Quanto", d?.quanto ?? null],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/matriz-gut" className="text-sm text-suave hover:text-texto">
          ← Matriz GUT
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{d?.o_que ?? t.titulo}</h1>
        <p className="text-sm text-suave">{t.obras?.codigo} · editar na planilha da Central de Gestão</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          ["GUT", d?.gut],
          ["Gravidade", d?.gravidade],
          ["Urgência", d?.urgencia],
          ["Tendência", d?.tendencia],
        ].map(([rotulo, valor], i) => (
          <Cartao key={rotulo as string}>
            <p className="text-xs text-suave">{rotulo}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{i === 0 ? <Etiqueta tom={faixaGut((valor as number | null | undefined) ?? null)}>{valor ?? "—"}</Etiqueta> : (valor ?? "—")}</p>
          </Cartao>
        ))}
      </div>

      <Cartao titulo="5W2H">
        <dl className="divide-y divide-borda text-sm">
          {linhas.map(([rotulo, valor]) => (
            <div key={rotulo} className="grid grid-cols-[6rem_1fr] gap-3 py-2">
              <dt className="text-suave">{rotulo}</dt>
              <dd className="whitespace-pre-wrap">{valor ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </Cartao>

      <Cartao titulo="Lembrete na agenda">
        <FormularioLembrete tarefaId={t.id} dataSugerida={dataSugeridaLembrete(t.prazo, hojeSP())} prazo={t.prazo ? dataCivil(t.prazo) : null} />
      </Cartao>
    </div>
  );
}
