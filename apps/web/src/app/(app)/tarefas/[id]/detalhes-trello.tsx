import { listasDoCartao } from "@cc/integrations/src/escrita.js";
import { Check } from "lucide-react";
import { Aviso, Cartao, EstadoVazio } from "@/components/ui";
import { tituloDoComentario } from "@/lib/equipe";
import { dataHora } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { transformarEmCartao } from "../acoes-trello";
import { TransformarEmCartao } from "./transformar-em-cartao";

async function carregarListas(idCartao: string) {
  const { TRELLO_API_KEY, TRELLO_TOKEN } = process.env;
  if (!TRELLO_API_KEY || !TRELLO_TOKEN) return null;
  try {
    const listas = await listasDoCartao({ chave: TRELLO_API_KEY, token: TRELLO_TOKEN }, idCartao);
    return listas.map((l) => ({ valor: l.id, rotulo: l.nome }));
  } catch {
    return null;
  }
}

/** Membros, checklists e comentários do cartão. Só o quadro detalhado tem esses dados (ADR 0017). */
export async function DetalhesTrello({ tarefaId, idCartao }: { tarefaId: string; idCartao: string }) {
  const { supabase } = await exigirSessaoCompleta();
  const [membros, itens, comentarios] = await Promise.all([
    supabase.from("tarefa_membros").select("trello_membros(nome)").eq("tarefa_id", tarefaId),
    supabase.from("trello_checklist_itens").select("*").eq("tarefa_id", tarefaId).order("checklist").order("posicao"),
    supabase.from("trello_comentarios").select("*").eq("tarefa_id", tarefaId).order("data", { ascending: false }),
  ]);
  const listaComentarios = comentarios.data ?? [];
  const [listas, criados] = await Promise.all([
    listaComentarios.length ? carregarListas(idCartao) : null,
    listaComentarios.length
      ? supabase.from("operacoes_externas").select("registro_id").eq("operacao", "criar").eq("status", "sucesso").in("registro_id", listaComentarios.map((c) => c.id))
      : null,
  ]);
  const jaCriados = new Set((criados?.data ?? []).map((o) => o.registro_id));

  const checklists = new Map<string, NonNullable<typeof itens.data>>();
  for (const i of itens.data ?? []) checklists.set(i.checklist, [...(checklists.get(i.checklist) ?? []), i]);

  return (
    <>
      <Cartao titulo="Membros">
        {(membros.data ?? []).length === 0 ? <p className="text-sm text-suave">Sem membros atribuídos.</p> : <p className="text-sm">{(membros.data ?? []).map((m) => m.trello_membros.nome).join(", ")}</p>}
      </Cartao>

      {[...checklists.entries()].map(([nome, lista]) => (
        <Cartao key={nome} titulo={`${nome} (${lista.filter((i) => i.concluido).length}/${lista.length})`}>
          <ul className="space-y-1.5 text-sm">
            {lista.map((i) => (
              <li key={i.id} className="flex items-start gap-2">
                <span className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded border ${i.concluido ? "border-ok text-ok" : "border-borda text-transparent"}`} aria-label={i.concluido ? "Concluído" : "Pendente"}>
                  <Check className="size-3" aria-hidden="true" />
                </span>
                <span className={i.concluido ? "text-suave line-through" : undefined}>{i.nome}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      ))}

      <Cartao titulo="Comentários">
        {listaComentarios.length === 0 ? (
          <EstadoVazio>Nenhum comentário.</EstadoVazio>
        ) : (
          <ul className="space-y-4">
            {listaComentarios.map((c) => (
              <li key={c.id}>
                <p className="text-xs text-suave">
                  {c.autor ?? "—"} · {dataHora(c.data)}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm">{c.texto}</p>
                {listas ? (
                  <TransformarEmCartao acao={transformarEmCartao.bind(null, c.id)} titulo={tituloDoComentario(c.texto)} listas={listas} jaCriado={jaCriados.has(c.id)} />
                ) : (
                  <div className="mt-2">
                    <Aviso tipo="info">Não foi possível consultar as listas do Trello agora.</Aviso>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </>
  );
}
