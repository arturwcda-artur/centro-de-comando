import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listasDoQuadroPorNome } from "@cc/integrations/src/escrita.js";
import { Aviso, Cartao } from "@/components/ui";
import { listaDaObra, membroPeloNome, prioridadePorGut } from "@/lib/cartao-acao";
import { QUADROS_EQUIPE } from "@/lib/equipe";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { criarCartaoDaAcao } from "../../../../acoes-trello";
import { FormularioCartao } from "./formulario-cartao";

export const metadata: Metadata = { title: "Criar cartão no Trello" };

/** Listas de cada quadro da equipe. A opção leva o quadro e a lista: "posição do quadro:id da lista". */
async function lerListas(): Promise<{ porQuadro: { id: string; nome: string }[][]; falha: string | null }> {
  const { TRELLO_API_KEY, TRELLO_TOKEN } = process.env;
  if (!TRELLO_API_KEY || !TRELLO_TOKEN) return { porQuadro: [], falha: "Gravação no Trello ainda não configurada no servidor." };
  try {
    const cred = { chave: TRELLO_API_KEY, token: TRELLO_TOKEN };
    return { porQuadro: await Promise.all(QUADROS_EQUIPE.map((q) => listasDoQuadroPorNome(cred, q))), falha: null };
  } catch (e) {
    return { porQuadro: [], falha: e instanceof Error ? e.message : "Não foi possível ler o Trello." };
  }
}

export default async function PaginaCartaoDaAcao({ params }: { params: Promise<{ id: string; acaoId: string }> }) {
  const { id, acaoId } = await params;
  if (!UUID.test(id) || !UUID.test(acaoId)) notFound();
  const { supabase } = await exigirSessaoCompleta();
  const [{ data: a }, { data: membros }, { porQuadro, falha }] = await Promise.all([
    supabase
      .from("tarefas")
      .select("titulo, prazo, fonte, responsavel_id, acoes_detalhes(o_que, quem), problemas(titulo, gut, obras(codigo, nome))")
      .eq("id", acaoId)
      .eq("problema_id", id)
      .maybeSingle(),
    supabase.from("trello_membros").select("id, nome, pessoa_id").order("nome"),
    lerListas(),
  ]);
  if (!a?.problemas) notFound();
  const opcoesDeLista = porQuadro.flatMap((listas, i) => listas.map((l) => ({ valor: `${i}:${l.id}`, rotulo: `${QUADROS_EQUIPE[i]} › ${l.nome}` })));
  const listaPadrao = porQuadro[0] ? listaDaObra(porQuadro[0], a.problemas.obras) : null;
  // Quem do 5W2H: a pessoa cadastrada ligada ao membro ou, se não houver, o nome escrito em "outro nome"
  const membroDaAcao = (membros ?? []).find((m) => m.pessoa_id && m.pessoa_id === a.responsavel_id)?.id ?? membroPeloNome(membros ?? [], a.acoes_detalhes?.quem);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href={`/problemas/${id}`} className="text-sm text-suave hover:text-texto">
          ← {a.problemas.titulo}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Criar cartão no Trello</h1>
        <p className="text-sm text-suave">
          O cartão entra no quadro da equipe que você escolher (<strong>{QUADROS_EQUIPE.join(" ou ")}</strong>), só com o O quê (título), o Quem (responsável) e o Quando (data). O resto do 5W2H fica no sistema. Depois disso, a ação acompanha o cartão: quando a equipe concluir no Trello, ela fica concluída aqui.
        </p>
      </div>
      <Cartao>
        {a.fonte !== "manual" ? (
          <Aviso>Esta ação já virou cartão no Trello.</Aviso>
        ) : falha ? (
          <Aviso>{falha}</Aviso>
        ) : (
          <FormularioCartao
            acao={criarCartaoDaAcao.bind(null, id, acaoId)}
            listas={opcoesDeLista}
            membros={(membros ?? []).map((m) => ({ valor: m.id, rotulo: m.nome }))}
            valores={{
              titulo: a.acoes_detalhes?.o_que ?? a.titulo,
              lista: listaPadrao ? `0:${listaPadrao}` : null,
              membro: membroDaAcao,
              prazo: a.prazo,
              prioridade: prioridadePorGut(a.problemas.gut),
            }}
          />
        )}
      </Cartao>
    </div>
  );
}
