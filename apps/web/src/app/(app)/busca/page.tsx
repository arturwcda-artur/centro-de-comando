import type { Metadata } from "next";
import Link from "next/link";
import { Building2, FileText, ListChecks } from "lucide-react";
import { Cartao, EstadoVazio } from "@/components/ui";
import { dataCivil } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Busca" };

/** Escapa curingas do ILIKE e caracteres especiais do filtro PostgREST. */
function termoSeguro(q: string) {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()]/g, " ");
}

export default async function PaginaBusca({ searchParams }: PageProps<"/busca">) {
  const { supabase } = await exigirSessaoCompleta();
  const bruto = (await searchParams).q;
  const q = (typeof bruto === "string" ? bruto : "").trim().slice(0, 100);

  if (!q) {
    return <EstadoVazio>Digite um termo na busca acima (atalho: Ctrl+K).</EstadoVazio>;
  }

  const t = termoSeguro(q);
  const [obras, tarefas, documentos] = await Promise.all([
    supabase.from("obras").select("id, codigo, nome, cidade, situacao").or(`nome.ilike.%${t}%,codigo.ilike.%${t}%,cidade.ilike.%${t}%`).limit(10),
    supabase.from("tarefas").select("id, titulo, prazo, status").ilike("titulo", `%${t}%`).limit(10),
    supabase.from("documentos").select("id, titulo, categoria, data_documento").textSearch("busca", q, { type: "websearch", config: "portuguese" }).limit(10),
  ]);
  const total = (obras.data?.length ?? 0) + (tarefas.data?.length ?? 0) + (documentos.data?.length ?? 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">
        Resultados para “{q}” <span className="text-sm font-normal text-suave">({total})</span>
      </h1>
      {total === 0 && <EstadoVazio>Nada encontrado. Os dados das obras, tarefas e documentos chegam nas Fases 4, 5 e 8.</EstadoVazio>}
      {!!obras.data?.length && (
        <Cartao titulo="Obras">
          <ul className="space-y-2">
            {obras.data.map((o) => (
              <li key={o.id} className="flex items-center gap-2 text-sm">
                <Building2 className="size-4 text-suave" aria-hidden="true" />
                <Link href={`/obras/${o.id}`} className="hover:text-marca hover:underline">
                  <span className="font-medium">{o.codigo}</span> {o.nome}
                </Link>
                <span className="text-xs text-suave">{o.cidade}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
      {!!tarefas.data?.length && (
        <Cartao titulo="Tarefas">
          <ul className="space-y-2">
            {tarefas.data.map((x) => (
              <li key={x.id} className="flex items-center gap-2 text-sm">
                <ListChecks className="size-4 text-suave" aria-hidden="true" />
                <Link href={`/tarefas/${x.id}`} className="flex-1 hover:text-marca hover:underline">
                  {x.titulo}
                </Link>
                <span className="text-xs text-suave">{dataCivil(x.prazo)}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
      {!!documentos.data?.length && (
        <Cartao titulo="Documentos">
          <ul className="space-y-2">
            {documentos.data.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-sm">
                <FileText className="size-4 text-suave" aria-hidden="true" />
                <span className="flex-1">{d.titulo}</span>
                <span className="text-xs text-suave">{dataCivil(d.data_documento)}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  );
}
