import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { Aviso, Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { espacoUsado } from "@/lib/documentos";
import { dataHora } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Integrações" };

const WORKFLOW = "https://github.com/arturwcda-artur/centro-de-comando/actions/workflows/sincronizar.yml";

const PREVISTAS = [
  { ferramenta: "trello", nome: "Trello", oque: "cartões dos quadros abertos → tarefas" },
  { ferramenta: "google_agenda", nome: "Google Agenda", oque: "eventos (−7 a +90 dias) → agenda" },
  { ferramenta: "notion", nome: "Notion", oque: "Central de Gestão: demandas → tarefas, reuniões → reuniões" },
  { ferramenta: "msproject", nome: "MS Project", oque: "cronogramas → planejamento (Fase 6)" },
  { ferramenta: "excel", nome: "Excel", oque: "planilhas de medição → contratos (Fase 7)" },
  { ferramenta: "google_drive", nome: "Google Drive", oque: "link dos documentos, só dados dos arquivos" },
];

const RETORNO_GOOGLE: Record<string, { tipo: "info" | "alerta"; texto: string }> = {
  conectado: { tipo: "info", texto: "Google conectado. A agenda passa a vir da API oficial na próxima sincronização." },
  cancelado: { tipo: "alerta", texto: "Conexão com o Google cancelada. Nada foi alterado." },
  "sem-configuracao": { tipo: "alerta", texto: "Faltam as chaves do Google no servidor." },
  erro: { tipo: "alerta", texto: "Não foi possível conectar ao Google. Tente de novo." },
};

const ESTADO: Record<string, { rotulo: string; tom: "ok" | "alerta" | "atencao" | "neutro" }> = {
  conectado: { rotulo: "Conectado", tom: "ok" },
  erro_autenticacao: { rotulo: "Erro de autorização", tom: "alerta" },
  erro: { rotulo: "Erro", tom: "alerta" },
  pausado: { rotulo: "Pausado", tom: "atencao" },
  nao_configurado: { rotulo: "Não configurado", tom: "neutro" },
};

export default async function PaginaIntegracoes({ searchParams }: PageProps<"/integracoes">) {
  const { google } = await searchParams;
  const retorno = typeof google === "string" ? RETORNO_GOOGLE[google] : undefined;
  const { supabase } = await exigirSessaoCompleta();
  const [conectores, execucoes, tamanho] = await Promise.all([
    supabase.from("conectores").select("*"),
    supabase.from("sync_execucoes").select("*, conectores(nome_exibicao)").order("iniciado_em", { ascending: false }).limit(15),
    supabase.rpc("tamanho_do_banco"),
  ]);
  const espaco = espacoUsado(tamanho.data ?? null);
  const porFerramenta = new Map((conectores.data ?? []).map((c) => [c.ferramenta, c]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrações</h1>
          <p className="text-sm text-suave">Sincronização automática a cada hora. O sistema só grava nas ferramentas em “Leitura e escrita”.</p>
        </div>
        <a href={WORKFLOW} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-borda bg-superficie px-3 text-sm font-medium hover:bg-superficie-2">
          Sincronizar agora <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </div>
      {retorno && <Aviso tipo={retorno.tipo}>{retorno.texto}</Aviso>}
      {espaco && <p className="text-sm text-suave">Espaço usado no banco gratuito: {espaco}</p>}
      <Aviso tipo="info">
        “Sincronizar agora” abre o GitHub: clique em <strong>Run workflow</strong>. Em cerca de 1 minuto os dados aparecem aqui.
      </Aviso>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PREVISTAS.map((p) => {
          const c = porFerramenta.get(p.ferramenta);
          const e = ESTADO[c?.estado_conexao ?? "nao_configurado"] ?? ESTADO.nao_configurado;
          return (
            <Cartao key={p.ferramenta}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold">{p.nome}</h2>
                <Etiqueta tom={e.tom}>{e.rotulo}</Etiqueta>
              </div>
              <p className="mt-1 text-xs text-suave">{p.oque}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-suave">Última</dt>
                  <dd>{dataHora(c?.ultima_sync_em)}</dd>
                </div>
                <div>
                  <dt className="text-suave">Próxima</dt>
                  <dd>{dataHora(c?.proxima_sync_em)}</dd>
                </div>
                <div>
                  <dt className="text-suave">Modo</dt>
                  <dd>{c ? (c.modo === "leitura" ? "Somente leitura" : "Leitura e escrita") : "—"}</dd>
                </div>
              </dl>
              {p.ferramenta === "google_agenda" && (
                // Link comum: a rota redireciona para o Google e não pode ser pré-carregada
                // eslint-disable-next-line @next/next/no-html-link-for-pages
                <a href="/api/google/conectar" className="mt-3 inline-flex h-9 items-center rounded-lg border border-borda px-3 text-xs font-medium hover:bg-superficie-2">
                  {c?.modo === "leitura_escrita" ? "Reconectar Google" : "Conectar Google"}
                </a>
              )}
            </Cartao>
          );
        })}
      </div>

      <Cartao titulo="Últimas execuções">
        {(execucoes.data ?? []).length === 0 ? (
          <EstadoVazio>Nenhuma sincronização executada ainda.</EstadoVazio>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-suave">
                <tr>
                  <th className="py-2 font-medium">Quando</th>
                  <th className="py-2 font-medium">Conector</th>
                  <th className="py-2 font-medium">Resultado</th>
                  <th className="py-2 text-right font-medium">Lidos</th>
                  <th className="py-2 text-right font-medium">Novos</th>
                  <th className="py-2 text-right font-medium">Alterados</th>
                  <th className="py-2 pl-4 font-medium">Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {(execucoes.data ?? []).map((x) => (
                  <tr key={x.id}>
                    <td className="py-2 tabular-nums">{dataHora(x.iniciado_em)}</td>
                    <td className="py-2">{x.conectores?.nome_exibicao}</td>
                    <td className="py-2">
                      <Etiqueta tom={x.status === "sucesso" ? "ok" : x.status === "erro" ? "alerta" : "atencao"}>{x.status}</Etiqueta>
                    </td>
                    <td className="py-2 text-right tabular-nums">{x.lidos}</td>
                    <td className="py-2 text-right tabular-nums">{x.criados}</td>
                    <td className="py-2 text-right tabular-nums">{x.atualizados}</td>
                    <td className="max-w-xs truncate py-2 pl-4 text-xs text-suave" title={x.mensagem ?? ""}>
                      {x.mensagem}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </div>
  );
}
