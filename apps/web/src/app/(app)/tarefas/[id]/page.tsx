import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoConcluir } from "@/components/botao-concluir";
import { Aviso, Cartao } from "@/components/ui";
import { podeConcluir, rotuloDe, STATUS_TAREFA } from "@/lib/dominio";
import { ehDoQuadroDaEquipe } from "@/lib/equipe";
import { dataCivil, dataHora } from "@/lib/formato";
import { carregarOpcoes, UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { concluirComDecisao, salvarTarefa } from "../acoes";
import { FormularioConclusao } from "./formulario-conclusao";
import { DetalhesTrello } from "./detalhes-trello";
import { FormularioTarefa } from "../formulario-tarefa";

export const metadata: Metadata = { title: "Tarefa" };

export default async function PaginaTarefa({ params }: PageProps<"/tarefas/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await exigirSessaoCompleta();
  const [tarefa, opcoes, obras, decisoes] = await Promise.all([
    supabase.from("tarefas").select("*").eq("id", id).maybeSingle(),
    carregarOpcoes(supabase),
    supabase.from("obras").select("id, codigo, nome").is("arquivado_em", null).order("codigo"),
    supabase.from("decisoes").select("id, decisao, data_decisao, afeta_planejamento, avaliacoes_planejamento(situacao)").eq("tarefa_id", id).order("criado_em"),
  ]);
  const t = tarefa.data;
  if (!t) notFound();
  const listaObras = (obras.data ?? []).map((o) => ({ valor: o.id, rotulo: `${o.codigo} — ${o.nome}` }));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/tarefas" className="text-sm text-suave hover:text-texto">
          ← Tarefas
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          #{t.codigo} {t.titulo}
        </h1>
        <p className="text-sm text-suave">
          {rotuloDe(STATUS_TAREFA, t.status)} · criada em {dataHora(t.criado_em)}
          {t.concluida_em && ` · concluída em ${dataHora(t.concluida_em)}`}
        </p>
      </div>
      {t.fonte !== "manual" ? (
        <Cartao>
          <Aviso tipo="info">
            Tarefa importada do <strong>{t.fonte}</strong>.{" "}
            {podeConcluir(t)
              ? "Ao concluir aqui, ela é concluída também na origem. Outras alterações são feitas na ferramenta de origem."
              : t.status === "concluida" || t.status === "cancelada"
                ? "Já encerrada."
                : "Só leitura: controlada na ferramenta de origem."}
          </Aviso>
          {podeConcluir(t) && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <BotaoConcluir id={t.id} titulo={t.titulo} /> Concluir tarefa
            </div>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-suave">Prazo</dt>
              <dd>{dataCivil(t.prazo)}</dd>
            </div>
            <div>
              <dt className="text-xs text-suave">Última importação</dt>
              <dd>{dataHora(t.importado_em)}</dd>
            </div>
          </dl>
          {t.descricao && <p className="mt-3 whitespace-pre-line text-sm">{t.descricao}</p>}
        </Cartao>
      ) : (
        <>
          {podeConcluir(t) && (
            <Cartao titulo="Concluir com saída / decisão">
              <FormularioConclusao acao={concluirComDecisao.bind(null, id)} />
            </Cartao>
          )}
          <Cartao>
            <FormularioTarefa acao={salvarTarefa.bind(null, id)} tarefa={t} obras={listaObras} pessoas={opcoes.pessoas} />
          </Cartao>
        </>
      )}
      {(decisoes.data ?? []).length > 0 && (
        <Cartao titulo="Decisões registradas">
          <ul className="divide-y divide-borda text-sm">
            {(decisoes.data ?? []).map((d) => (
              <li key={d.id} className="py-2">
                <p className="whitespace-pre-line">{d.decisao}</p>
                <p className="mt-1 text-xs text-suave">
                  {dataCivil(d.data_decisao)}
                  {d.afeta_planejamento && " · afeta o planejamento da obra"}
                  {d.afeta_planejamento && (
                    <>
                      {" · "}
                      <Link href={`/planejamento/decisoes/${d.id}`} className="text-marca hover:underline">
                        {d.avaliacoes_planejamento ? "ver avaliação no planejamento" : "avaliar no planejamento →"}
                      </Link>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
      {t.trello_cartao_id && (
        <p className="text-xs text-suave">
          Espelhada no quadro tarefas do Trello ·{" "}
          <a href={`https://trello.com/c/${t.trello_cartao_id}`} target="_blank" rel="noopener noreferrer" className="hover:text-texto hover:underline">
            ver cartão
          </a>
        </p>
      )}
      {t.fonte === "trello" && t.id_externo && ehDoQuadroDaEquipe(t.categoria) && <DetalhesTrello tarefaId={t.id} idCartao={t.id_externo} />}
    </div>
  );
}
