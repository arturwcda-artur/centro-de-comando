import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Send } from "lucide-react";
import { LinhaTarefa } from "@/components/linha-tarefa";
import { Cartao, EstadoVazio } from "@/components/ui";
import { VISOES_TAREFA, type VisaoTarefa } from "@/lib/dominio";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { hojeSP } from "@/lib/formato";
import { linkWhatsApp, mensagemDeTarefas } from "@/lib/whatsapp";
import { carregarResponsaveis, contarVisoes, tarefasDaVisao } from "@/lib/tarefas";

export const metadata: Metadata = { title: "Tarefas" };

const ORIGENS = [
  { valor: "manual", rotulo: "Criadas aqui" },
  { valor: "trello", rotulo: "Trello" },
];

export default async function PaginaTarefas({ searchParams }: PageProps<"/tarefas">) {
  const params = await searchParams;
  const quadro = typeof params.quadro === "string" && params.quadro ? params.quadro : null;
  const membro = typeof params.membro === "string" && UUID.test(params.membro) ? params.membro : null;
  // Abre em Todas: o Centro de Comando acompanha a equipe inteira, não só as atribuições do proprietário
  const visao = (VISOES_TAREFA.find((v) => v.valor === params.visao)?.valor ?? "todas") as VisaoTarefa;
  const obraId = typeof params.obra === "string" && UUID.test(params.obra) ? params.obra : null;
  const fonte = ORIGENS.some((o) => o.valor === params.origem) ? (params.origem as string) : null;
  const { supabase } = await exigirSessaoCompleta();

  const [lista, contagem, obras, responsaveis] = await Promise.all([
    tarefasDaVisao(supabase, visao, obraId, fonte, quadro, membro),
    contarVisoes(supabase),
    supabase.from("obras").select("id, codigo, nome").is("arquivado_em", null).order("codigo"),
    carregarResponsaveis(supabase),
  ]);
  const nomeObra = new Map((obras.data ?? []).map((o) => [o.id, o.codigo]));
  const itens = visao === "concluidas" ? lista.concluidas : lista.abertas;
  // Envio por WhatsApp (RN-49j): uma mensagem por responsável, com as tarefas que estão na tela
  const hoje = hojeSP();
  const envios = responsaveis.membros
    .filter((m) => !membro || m.id === membro)
    .map((m) => {
      const dele = itens.filter((t) => t.id && responsaveis.idsPorTarefa.get(t.id)?.includes(m.id));
      const mensagem = mensagemDeTarefas(m.nome, dele.map((t) => ({ titulo: t.titulo, prazo: t.prazo, vencida: "vencida" in t ? t.vencida : false, obra: t.obra_id ? nomeObra.get(t.obra_id) : undefined })), hoje);
      return { ...m, quantidade: dele.length, link: linkWhatsApp(mensagem, m.telefone) };
    })
    .filter((m) => m.quantidade > 0);
  const sufixo = `${obraId ? `&obra=${obraId}` : ""}${fonte ? `&origem=${fonte}` : ""}${quadro ? `&quadro=${encodeURIComponent(quadro)}` : ""}${membro ? `&membro=${membro}` : ""}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
          <p className="text-sm text-suave">Ordenadas pela prioridade: 3·urgência + 2·importância + 2·impacto. Os prazos nunca são alterados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form method="get" className="flex flex-wrap gap-2">
            <input type="hidden" name="visao" value={visao} />
            <select name="obra" defaultValue={obraId ?? ""} aria-label="Filtrar por obra" className="h-10 rounded-lg border border-borda bg-superficie px-2 text-sm">
              <option value="">Todas as obras</option>
              {(obras.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.codigo}
                </option>
              ))}
            </select>
            <select name="origem" defaultValue={fonte ?? ""} aria-label="Filtrar por origem" className="h-10 rounded-lg border border-borda bg-superficie px-2 text-sm">
              <option value="">Todas as origens</option>
              {ORIGENS.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
            <select name="quadro" defaultValue={quadro ?? ""} aria-label="Filtrar por quadro do Trello" className="h-10 max-w-48 rounded-lg border border-borda bg-superficie px-2 text-sm">
              <option value="">Todos os quadros</option>
              {contagem.quadros.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
            <select name="membro" defaultValue={membro ?? ""} aria-label="Filtrar por responsável" className="h-10 max-w-48 rounded-lg border border-borda bg-superficie px-2 text-sm">
              <option value="">Todos os responsáveis</option>
              {responsaveis.membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
            <button className="h-10 rounded-lg border border-borda bg-superficie px-3 text-sm hover:bg-superficie-2">Filtrar</button>
          </form>
          <Link href="/tarefas/nova" className="inline-flex h-10 items-center gap-2 rounded-lg bg-marca px-3 text-sm font-medium text-white hover:opacity-90">
            <Plus className="size-4" aria-hidden="true" /> Nova tarefa
          </Link>
        </div>
      </div>

      <nav aria-label="Visões" className="flex gap-1 overflow-x-auto border-b border-borda">
        {VISOES_TAREFA.map((v) => {
          const n = contagem[v.valor];
          return (
            <Link
              key={v.valor}
              href={`/tarefas?visao=${v.valor}${sufixo}`}
              aria-current={v.valor === visao ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${v.valor === visao ? "border-marca font-medium" : "border-transparent text-suave hover:text-texto"}`}
            >
              {v.rotulo}
              {n !== null && n > 0 && <span className="ml-1.5 text-xs text-suave">{n}</span>}
            </Link>
          );
        })}
      </nav>

      {envios.length > 0 && (
        <Cartao titulo="Enviar por WhatsApp">
          <p className="mb-3 text-sm text-suave">
            Cada botão abre o WhatsApp com a lista das tarefas que estão na tela para aquele responsável. Você confere e envia. Quem não tem telefone em Cadastros → Pessoas abre a escolha do contato.
          </p>
          <ul className="flex flex-wrap gap-2">
            {envios.map((m) => (
              <li key={m.id}>
                <a
                  href={m.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-borda bg-superficie px-3 text-sm hover:bg-superficie-2"
                >
                  <Send className="size-4 text-ok" aria-hidden="true" />
                  {m.nome.split(" ")[0]} · {m.quantidade}
                  {!m.telefone && <span className="text-xs text-suave">(sem telefone)</span>}
                </a>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <Cartao>
        {itens.length === 0 ? (
          <EstadoVazio>Nenhuma tarefa nesta visão.</EstadoVazio>
        ) : (
          <ul className="divide-y divide-borda">
            {itens.map((t) => (
              <LinhaTarefa key={t.id} t={t} nomeObra={t.obra_id ? nomeObra.get(t.obra_id) : undefined} responsaveis={t.id ? responsaveis.porTarefa.get(t.id) : undefined} />
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
