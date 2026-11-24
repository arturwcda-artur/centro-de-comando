import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso, Cartao, Etiqueta } from "@/components/ui";
import { TIPOS_MUDANCA } from "@/lib/cerebro";
import { calcular, carregarAvaliacao, mudancaDe } from "@/lib/cerebro-dados";
import { dataCivil, dataHora } from "@/lib/formato";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { aprovarAvaliacao, naoAlterar } from "../acoes";
import { FormularioAprovar } from "./formulario-aprovar";

export const metadata: Metadata = { title: "Avaliar no planejamento" };

const CAMPO = "h-10 w-full rounded-lg border border-borda bg-superficie-2 px-2 text-sm";
const sinal = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Cérebro do planejamento (RN-49n): escolhe a atividade e a mudança, vê o efeito e decide. */
export default async function PaginaAvaliarDecisao({ params, searchParams }: PageProps<"/planejamento/decisoes/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await exigirSessaoCompleta();
  const dados = await carregarAvaliacao(supabase, id);
  if (!dados) notFound();
  const sp = await searchParams;
  const { decisao: d, versao, avaliacao } = dados;

  // Sem escolha na tela, mostra de novo a mudança já aprovada
  const escolhida = mudancaDe({ atividade: sp.atividade, tipo: sp.tipo, dias: sp.dias });
  const salva = avaliacao?.situacao === "aprovada" ? mudancaDe({ atividade: avaliacao.atividade_id, tipo: avaliacao.tipo_mudanca, dias: avaliacao.dias }) : null;
  const mudanca = escolhida ?? salva;
  const r = calcular(dados, mudanca);
  const opcoes = dados.atividades.filter((a) => !a.resumo);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href="/planejamento/decisoes" className="text-sm text-suave hover:text-texto">
          ← Decisões no planejamento
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Avaliar no planejamento</h1>
        <p className="text-sm text-suave">
          {d.obras?.codigo ?? "Sem obra"} · decisão de {dataCivil(d.data_decisao)}
          {d.tarefa_id && (
            <>
              {" · "}
              <Link href={`/tarefas/${d.tarefa_id}`} className="hover:text-texto hover:underline">
                tarefa de origem
              </Link>
            </>
          )}
        </p>
      </div>

      <Cartao titulo="Decisão">
        <p className="whitespace-pre-line text-sm">{d.decisao}</p>
        <p className="mt-2 text-xs text-suave">Tarefa: {d.problema}</p>
        {avaliacao && (
          <p className="mt-3 text-sm">
            {avaliacao.situacao === "nao_alterar" ? <Etiqueta>Não altera o planejamento</Etiqueta> : <Etiqueta tom="ok">Alteração aprovada</Etiqueta>}{" "}
            <span className="text-xs text-suave">em {dataHora(avaliacao.decidido_em)}</span>
          </p>
        )}
        {avaliacao?.situacao === "aprovada" &&
          (avaliacao.conferida_em ? (
            <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${avaliacao.conferencia === "conforme" ? "bg-ok-suave text-ok" : "bg-alerta-suave text-alerta"}`}>
              <strong>Nova revisão {avaliacao.conferencia === "conforme" ? "conforme a rota" : "diferente da rota"}</strong> (conferida em {dataHora(avaliacao.conferida_em)}). {avaliacao.conferencia_detalhe}
            </div>
          ) : (
            <p className="mt-3 text-xs text-suave">Aguardando a nova revisão em VALIDOS. Quando ela for lida, o sistema confere se ficou como a rota previa.</p>
          ))}
      </Cartao>

      {!d.obra_id ? (
        <Aviso>A tarefa de origem não tem obra. Sem obra, não há cronograma para avaliar.</Aviso>
      ) : !versao ? (
        <Aviso>A obra ainda não tem cronograma vigente lido da pasta VALIDOS.</Aviso>
      ) : (
        <Cartao titulo={`Cronograma vigente: ${versao.nome}`}>
          <form method="get" className="grid gap-3 sm:grid-cols-[1fr_14rem_7rem_auto] sm:items-end">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Atividade afetada</span>
              <select name="atividade" defaultValue={mudanca?.atividadeId ?? ""} required className={CAMPO}>
                <option value="">— escolha —</option>
                {opcoes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.edt ? `${a.edt} ` : ""}
                    {a.nome} ({dataCivil(a.inicio_previsto)} a {dataCivil(a.fim_previsto)}
                    {a.critica ? ", crítica" : ""})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Mudança</span>
              <select name="tipo" defaultValue={mudanca?.tipo ?? "atrasar"} className={CAMPO}>
                {TIPOS_MUDANCA.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Dias</span>
              <input type="number" name="dias" min={0} max={2000} step={1} defaultValue={mudanca?.dias ?? ""} required className={CAMPO} />
            </label>
            <button className="h-10 rounded-lg border border-borda bg-superficie px-4 text-sm font-medium hover:bg-superficie-2">Calcular</button>
          </form>
          <p className="mt-2 text-xs text-suave">
            {dados.atividades.length} atividades e {dados.ligacoes.length} ligações. Prazo contratual: {dataCivil(dados.prazoContratual)}. Dias úteis de segunda a sexta; o Project recalcula com o calendário da obra.
          </p>
        </Cartao>
      )}

      {r && mudanca && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Término hoje", dataCivil(r.terminoAntes)],
              ["Término com a decisão", dataCivil(r.terminoDepois)],
              ["Variação", r.variacaoUteis === 0 ? "nenhuma" : `${sinal(r.variacaoUteis)} dias úteis`],
              ["Atividades deslocadas", String(r.deslocadas.length)],
            ].map(([rotulo, valor]) => (
              <Cartao key={rotulo}>
                <p className="text-xs text-suave">{rotulo}</p>
                <p className={`mt-1 text-lg font-semibold tabular-nums ${rotulo === "Variação" && r.variacaoUteis > 0 ? "text-alerta" : rotulo === "Variação" && r.variacaoUteis < 0 ? "text-ok" : ""}`}>{valor}</p>
              </Cartao>
            ))}
          </div>

          {(r.conflitos.length > 0 || r.avisos.length > 0) && (
            <Cartao titulo="Conflitos e avisos">
              <ul className="space-y-2 text-sm">
                {r.conflitos.map((c) => (
                  <li key={c} className="rounded-lg bg-alerta-suave px-3 py-2 text-alerta">
                    {c}
                  </li>
                ))}
                {r.avisos.map((c) => (
                  <li key={c} className="rounded-lg bg-marca-suave px-3 py-2 text-marca">
                    {c}
                  </li>
                ))}
              </ul>
            </Cartao>
          )}

          <Cartao titulo="Rota para alterar o Project">
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              {r.rota.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
          </Cartao>

          {r.deslocadas.length > 0 && (
            <Cartao titulo={`Atividades que andam junto (${r.deslocadas.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-suave">
                    <tr>
                      <th className="py-1.5 pr-3 font-medium">Atividade</th>
                      <th className="py-1.5 pr-3 font-medium">Fim hoje</th>
                      <th className="py-1.5 pr-3 font-medium">Fim novo</th>
                      <th className="py-1.5 text-right font-medium">Dias úteis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borda">
                    {r.deslocadas.slice(0, 40).map((a) => (
                      <tr key={a.id}>
                        <td className="py-1.5 pr-3">
                          {a.rotulo}
                          {a.critica && <span className="ml-1 text-xs text-alerta">crítica</span>}
                          {a.marco && <span className="ml-1 text-xs text-marca">marco</span>}
                        </td>
                        <td className="py-1.5 pr-3 tabular-nums">{dataCivil(a.fim)}</td>
                        <td className="py-1.5 pr-3 tabular-nums">{dataCivil(a.fimNovo)}</td>
                        <td className="py-1.5 text-right tabular-nums">{sinal(a.dias)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {r.deslocadas.length > 40 && <p className="mt-2 text-xs text-suave">Mostrando as 40 que mais andam.</p>}
            </Cartao>
          )}
        </>
      )}

      <Cartao titulo="Sua decisão">
        <p className="mb-3 text-sm text-suave">
          Aprovar leva a rota para a tarefa &quot;Atualizar o cronograma&quot; (e o cartão no Trello). Não alterar conclui essa tarefa e registra que a decisão não mexe no planejamento.
        </p>
        <div className="flex flex-wrap items-start gap-3">
          {r && mudanca ? (
            <FormularioAprovar acao={aprovarAvaliacao.bind(null, id)} atividade={mudanca.atividadeId} tipo={mudanca.tipo} dias={mudanca.dias} />
          ) : (
            <p className="text-sm text-suave">Calcule a mudança para poder aprovar.</p>
          )}
          <form action={naoAlterar.bind(null, id)}>
            <button className="h-10 rounded-lg border border-borda bg-superficie px-4 text-sm font-medium hover:bg-superficie-2">Não alterar o planejamento</button>
          </form>
        </div>
      </Cartao>
    </div>
  );
}
