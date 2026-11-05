import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { Aviso, Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { diferencaEmDias } from "@/lib/curva-s";
import { avisosDocumentos, CATEGORIAS_DOCUMENTO, partesDoTrecho } from "@/lib/documentos";
import { dataCivil, hojeSP } from "@/lib/formato";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { CopiarCaminho } from "./copiar-caminho";

export const metadata: Metadata = { title: "Documentos" };

const CAMPO = "h-10 rounded-lg border border-borda bg-superficie px-2 text-sm";
const rotuloCategoria = (valor: string | null) => CATEGORIAS_DOCUMENTO.find((c) => c.valor === valor)?.rotulo ?? "Outros";

export default async function PaginaDocumentos({ searchParams }: PageProps<"/documentos">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const obra = typeof params.obra === "string" && UUID.test(params.obra) ? params.obra : null;
  const categoria = CATEGORIAS_DOCUMENTO.some((c) => c.valor === params.categoria) ? (params.categoria as string) : null;
  const obsoletos = params.obsoletos === "on";

  const { supabase } = await exigirSessaoCompleta();
  const [resultados, obras, pastas, total, comLink, digitalizados] = await Promise.all([
    supabase.rpc("buscar_documentos", { p_busca: q, p_obra: obra ?? undefined, p_categoria: categoria ?? undefined, p_obsoletos: obsoletos }),
    supabase.from("obras").select("id, codigo").order("codigo"),
    supabase.from("documento_pastas").select("obra_id, ultima_leitura_em, ultimo_erro"),
    supabase.from("documentos").select("id", { count: "exact", head: true }).eq("fonte", "pasta").is("arquivado_em", null),
    supabase.from("documento_links").select("documento_id", { count: "exact", head: true }),
    supabase.from("documentos").select("id", { count: "exact", head: true }).eq("sem_texto", true).is("arquivado_em", null),
  ]);

  const codigo = new Map((obras.data ?? []).map((o) => [o.id, o.codigo]));
  const obrasComPasta = (pastas.data ?? []).map((p) => p.obra_id);
  const leituras = (pastas.data ?? []).map((p) => p.ultima_leitura_em).filter((d): d is string => !!d).sort();
  const avisos = avisosDocumentos({
    semLink: Math.max((total.count ?? 0) - (comLink.count ?? 0), 0),
    digitalizados: digitalizados.count ?? 0,
    erro: (pastas.data ?? []).find((p) => p.ultimo_erro)?.ultimo_erro ?? null,
    diasDesdeLeitura: leituras[0] ? diferencaEmDias(leituras[0].slice(0, 10), hojeSP()) : null,
  });
  const lista = resultados.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
        <p className="text-sm text-suave">{total.count ?? 0} documentos no índice. Os arquivos ficam nas pastas e no Drive, sem cópia.</p>
      </div>

      {avisos.map((a) => (
        <Aviso key={a} tipo="info">
          {a}
        </Aviso>
      ))}

      <form method="get" className="flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={q} aria-label="Buscar por nome ou conteúdo" placeholder="Buscar por nome ou conteúdo" className={`${CAMPO} min-w-56 flex-1`} />
        <select name="obra" defaultValue={obra ?? ""} aria-label="Filtrar por obra" className={CAMPO}>
          <option value="">Todas as obras</option>
          {obrasComPasta.map((id) => (
            <option key={id} value={id}>
              {codigo.get(id)}
            </option>
          ))}
        </select>
        <select name="categoria" defaultValue={categoria ?? ""} aria-label="Filtrar por categoria" className={CAMPO}>
          <option value="">Todas as categorias</option>
          {CATEGORIAS_DOCUMENTO.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.rotulo}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="obsoletos" defaultChecked={obsoletos} className="size-4" /> Incluir obsoletos
        </label>
        <button className="h-10 rounded-lg bg-marca px-4 text-sm font-medium text-white hover:opacity-90">Buscar</button>
      </form>

      <Cartao titulo={q ? `Resultados para “${q}”` : "Mais recentes"}>
        {lista.length === 0 ? (
          <EstadoVazio>{total.count ? "Nenhum documento encontrado." : "O índice ainda está vazio. Rode o atalho Atualizar cronogramas."}</EstadoVazio>
        ) : (
          <ul className="divide-y divide-borda">
            {lista.map((d) => (
              <li key={d.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  {d.url ? (
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium hover:text-marca hover:underline">
                      <span className="truncate">{d.titulo}</span>
                      <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                    </a>
                  ) : (
                    <p className="truncate text-sm font-medium">{d.titulo}</p>
                  )}
                  <p className="truncate text-xs text-suave">
                    {[codigo.get(d.obra_id ?? ""), rotuloCategoria(d.categoria), d.pasta, dataCivil(d.data_documento)].filter(Boolean).join(" · ")}
                  </p>
                  {d.trecho && (
                    <p className="mt-1 line-clamp-2 text-xs">
                      {partesDoTrecho(d.trecho).map((p, i) => (p.destaque ? <mark key={i} className="rounded bg-atencao-suave px-0.5 text-texto">{p.texto}</mark> : <span key={i}>{p.texto}</span>))}
                    </p>
                  )}
                  {(d.obsoleto || d.sem_texto) && (
                    <p className="mt-1 flex gap-1">
                      {d.obsoleto && <Etiqueta tom="atencao">Obsoleto</Etiqueta>}
                      {d.sem_texto && <Etiqueta>Digitalizado</Etiqueta>}
                    </p>
                  )}
                </div>
                {!d.url && d.caminho_local && <CopiarCaminho caminho={d.caminho_local} />}
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
