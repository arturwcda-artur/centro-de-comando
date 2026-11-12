import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoConcluir } from "@/components/botao-concluir";
import { Aviso, Cartao } from "@/components/ui";
import { podeConcluir, rotuloDe, STATUS_TAREFA } from "@/lib/dominio";
import { QUADRO_EQUIPE } from "@/lib/equipe";
import { dataCivil, dataHora } from "@/lib/formato";
import { carregarOpcoes, UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { salvarTarefa } from "../acoes";
import { DetalhesTrello } from "./detalhes-trello";
import { FormularioTarefa } from "../formulario-tarefa";

export const metadata: Metadata = { title: "Tarefa" };

export default async function PaginaTarefa({ params }: PageProps<"/tarefas/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await exigirSessaoCompleta();
  const [tarefa, opcoes, obras] = await Promise.all([
    supabase.from("tarefas").select("*").eq("id", id).maybeSingle(),
    carregarOpcoes(supabase),
    supabase.from("obras").select("id, codigo, nome").is("arquivado_em", null).order("codigo"),
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
            {t.fonte === "planilha" ? (
              <>
                Ação do <strong>plano de ações da obra</strong> (Central de Gestão, aba AÇÕES). Aqui ela só é mostrada e
                priorizada: status, prazo e responsável são atualizados na planilha, e o agente local traz a mudança na
                próxima leitura.
                {t.status_sync === "pendente" && " Atenção: esta ação não está mais na planilha. Confira se a linha foi apagada ou trocada de lugar."}
              </>
            ) : (
              <>
            Tarefa importada do <strong>{t.fonte}</strong>.{" "}
            {podeConcluir(t)
              ? "Ao concluir aqui, ela é concluída também na origem. Outras alterações são feitas na ferramenta de origem."
              : t.status === "concluida" || t.status === "cancelada"
                ? "Já encerrada."
                : "É uma tarefa de terceiros: só leitura, controlada na ferramenta de origem."}
              </>
            )}
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
        <Cartao>
          <FormularioTarefa acao={salvarTarefa.bind(null, id)} tarefa={t} obras={listaObras} pessoas={opcoes.pessoas} />
        </Cartao>
      )}
      {t.fonte === "trello" && t.id_externo && t.categoria?.startsWith(`${QUADRO_EQUIPE} › `) && <DetalhesTrello tarefaId={t.id} idCartao={t.id_externo} />}
    </div>
  );
}
