import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GraficoCurvaS, type SerieCurva } from "@/components/grafico-curva-s";
import { Aviso, Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { valorAnterior } from "@/lib/contratos";
import { atrasada, diferencaEmDias, serieSemanal, terminoPrevisto, type PontoCurva } from "@/lib/curva-s";
import { brl, dataCivil, dataHora, hojeSP, pct } from "@/lib/formato";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { salvarExecutadoAnterior, tornarLinhaBase } from "./acoes";
import { BotaoLinhaBase, FormularioExecutado } from "./formularios";

export const metadata: Metadata = { title: "Planejamento da obra" };

const ROTULO_TIPO: Record<string, string> = { vigente: "Vigente", linha_base: "Linha de base", reprogramacao: "Reprogramação", historico: "Histórico" };
const FILTROS = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "criticas", rotulo: "Caminho crítico" },
  { valor: "atrasadas", rotulo: "Atrasadas" },
];
const DIAS_LEITURA_ANTIGA = 7;

const prazo = (dias: number | null) => (dias === null ? "—" : dias === 0 ? "Sem diferença" : `${Math.abs(dias)} dias ${dias > 0 ? "depois" : "antes"}`);

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <Cartao>
      <p className="text-xs text-suave">{rotulo}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{valor}</p>
      {detalhe && <p className="text-xs text-suave">{detalhe}</p>}
    </Cartao>
  );
}

export default async function PaginaPlanejamentoObra({ params, searchParams }: PageProps<"/planejamento/[id]">) {
  const { id } = await params;
  const { filtro: filtroBruto } = await searchParams;
  const filtro = typeof filtroBruto === "string" ? filtroBruto : "todas";
  if (!UUID.test(id)) notFound();

  const { supabase } = await exigirSessaoCompleta();
  const [obra, arquivosR, versoesR, realizadoR, marcosR, contratosR, medicoesR] = await Promise.all([
    supabase.from("obras").select("id, codigo, nome").eq("id", id).maybeSingle(),
    supabase.from("cronograma_arquivos").select("*").eq("obra_id", id).order("papel"),
    supabase.from("cronograma_versoes").select("id, nome, tipo, importado_em, arquivo_id").eq("obra_id", id).order("importado_em", { ascending: false }),
    supabase.from("cronograma_realizado").select("*").eq("obra_id", id).order("data_leitura"),
    supabase.from("marcos").select("nome, data_contratual").eq("obra_id", id).eq("contratual", true),
    supabase.from("v_contratos_resumo").select("valor_contratado").eq("obra_id", id),
    supabase.from("medicoes").select("situacao, periodo_fim, valor_medido, valor_glosado, contratos!inner(obra_id)").eq("contratos.obra_id", id),
  ]);
  if (!obra.data) notFound();

  const arquivos = arquivosR.data ?? [];
  const versoes = versoesR.data ?? [];
  const arquivoVigente = arquivos.find((a) => a.papel === "vigente");
  const vigente = versoes.find((v) => v.tipo === "vigente");
  const linhaBase = versoes.find((v) => v.tipo === "linha_base");

  const colunas = "id, uid_project, edt, nome, nivel, resumo, marco, critica, inicio_previsto, fim_previsto, percentual, custo";
  const [atividadesVigente, atividadesBase] = await Promise.all([
    vigente ? supabase.from("atividades_cronograma").select(colunas).eq("versao_id", vigente.id).order("uid_project") : null,
    linhaBase ? supabase.from("atividades_cronograma").select(colunas).eq("versao_id", linhaBase.id).order("uid_project") : null,
  ]);
  const listaVigente = atividadesVigente?.data ?? [];
  const listaBase = atividadesBase?.data ?? [];

  const hoje = hojeSP();
  const inicio = listaVigente.map((a) => a.inicio_previsto).filter((d): d is string => !!d).sort()[0] ?? null;
  const partida = valorAnterior(medicoesR.data ?? [], inicio, { valor: arquivoVigente?.valor_executado_anterior ?? null, data: arquivoVigente?.data_executado_anterior ?? null });
  const anterior = partida.valor;
  const realizados = (realizadoR.data ?? []).filter((r) => r.arquivo_id === arquivoVigente?.id);
  const atual = realizados.find((r) => r.versao_id === vigente?.id);
  const totalVigente = atual?.total ?? 0;
  const executado = anterior + (atual?.realizado ?? 0);
  const avanco = totalVigente + anterior > 0 ? (executado / (totalVigente + anterior)) * 100 : null;

  const termino = terminoPrevisto(listaVigente);
  const terminoBase = terminoPrevisto(listaBase);
  const limite = (marcosR.data ?? []).find((m) => m.data_contratual)?.data_contratual ?? null;

  const pontosRealizado: PontoCurva[] = [
    ...(partida.data ? [{ data: partida.data, valor: anterior }] : []),
    ...realizados.map((r) => ({ data: r.data_leitura as string, valor: anterior + (r.realizado ?? 0) })),
  ];
  const series: SerieCurva[] = [
    { nome: "Linha de base", classe: "text-suave", pontos: serieSemanal(listaBase), tracejada: true },
    { nome: "Vigente", classe: "text-marca", pontos: serieSemanal(listaVigente, anterior) },
    { nome: "Realizado", classe: "text-ok", pontos: pontosRealizado, marcadores: true },
  ];

  const folhas = listaVigente.filter((a) => !a.resumo);
  const semCusto = folhas.filter((a) => !a.marco && !a.custo).length;
  const totalBase = listaBase.filter((a) => !a.resumo).reduce((s, a) => s + (a.custo ?? 0), 0);
  const totalContrato = (contratosR.data ?? []).reduce((s, c) => s + (c.valor_contratado ?? 0), 0);
  const antigos = arquivos.filter((a) => a.ultima_leitura_em && diferencaEmDias(a.ultima_leitura_em.slice(0, 10), hoje) > DIAS_LEITURA_ANTIGA);

  const avisos = [
    ...arquivos.filter((a) => a.ultimo_erro).map((a) => `${a.caminho.split("\\").at(-1)}: ${a.ultimo_erro}`),
    ...(vigente && partida.origem === "digitado" && !arquivoVigente?.valor_executado_anterior ? ["Informe o valor executado antes da retomada: sem ele, a curva vigente começa em zero."] : []),
    ...(semCusto > 0 ? [`${semCusto} atividades do cronograma vigente estão sem custo e não pesam na Curva S.`] : []),
    ...(versoes.some((v) => v.tipo === "reprogramacao") ? ["O arquivo da linha de base mudou. A linha de base só troca se você confirmar, em Versões."] : []),
    ...(totalContrato > 0 && Math.abs(totalContrato - (totalVigente + anterior)) > 1 ? [`Vigente mais executado soma ${brl(totalVigente + anterior)}, e o contrato, ${brl(totalContrato)}.`] : []),
    ...(totalBase > 0 && vigente && Math.abs(totalBase - (totalVigente + anterior)) > 1 ? [`A linha de base soma ${brl(totalBase)}, e o vigente mais o executado, ${brl(totalVigente + anterior)}.`] : []),
    ...(antigos.length > 0 ? [`${antigos.length} arquivos não são lidos há mais de ${DIAS_LEITURA_ANTIGA} dias.`] : []),
  ];

  const visiveis = listaVigente.filter((a) => (filtro === "criticas" ? a.critica && !a.resumo : filtro === "atrasadas" ? atrasada(a, hoje) : true));

  return (
    <div className="space-y-5">
      <div>
        <Link href="/planejamento" className="text-sm text-suave hover:text-texto">
          ← Planejamento
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{obra.data.codigo}</h1>
        <p className="text-sm text-suave">{vigente ? `Cronograma vigente: ${vigente.nome}` : "Aguardando a primeira leitura dos cronogramas."}</p>
      </div>

      {avisos.map((a) => (
        <Aviso key={a} tipo="info">
          {a}
        </Aviso>
      ))}

      {vigente && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicador rotulo="Início" valor={dataCivil(inicio)} />
            <Indicador rotulo="Término previsto" valor={dataCivil(termino)} detalhe={limite ? `Limite: ${dataCivil(limite)}` : undefined} />
            <Indicador rotulo="Avanço" valor={pct(avanco)} detalhe={`${brl(executado)} executados`} />
            <Indicador
              rotulo="Em relação à linha de base"
              valor={prazo(termino && terminoBase ? diferencaEmDias(terminoBase, termino) : null)}
              detalhe={limite && termino ? `Folga até o limite: ${diferencaEmDias(termino, limite)} dias` : undefined}
            />
          </div>

          <Cartao titulo="Curva S (R$ acumulados)">
            <GraficoCurvaS series={series} />
          </Cartao>
        </>
      )}

      {partida.origem === "medicoes" && (
        <Aviso tipo="info">
          O valor executado antes da retomada ({brl(anterior)}) vem das medições aprovadas. O valor digitado fica como reserva.
        </Aviso>
      )}

      {arquivoVigente && partida.origem === "digitado" && (
        <Cartao titulo="Valor executado antes da retomada">
          <FormularioExecutado
            acao={salvarExecutadoAnterior.bind(null, arquivoVigente.id, id)}
            valor={arquivoVigente.valor_executado_anterior}
            data={arquivoVigente.data_executado_anterior}
          />
        </Cartao>
      )}

      {vigente && (
        <Cartao titulo="Atividades do cronograma vigente">
          <nav aria-label="Filtro de atividades" className="mb-3 flex flex-wrap gap-2">
            {FILTROS.map((f) => (
              <Link
                key={f.valor}
                href={`/planejamento/${id}?filtro=${f.valor}`}
                aria-current={filtro === f.valor ? "page" : undefined}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${filtro === f.valor ? "border-marca bg-marca-suave" : "border-borda hover:bg-superficie-2"}`}
              >
                {f.rotulo}
              </Link>
            ))}
          </nav>
          {visiveis.length === 0 ? (
            <EstadoVazio>Nenhuma atividade neste filtro.</EstadoVazio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs text-suave">
                  <tr>
                    <th className="py-2 font-medium">Atividade</th>
                    <th className="py-2 font-medium">Início</th>
                    <th className="py-2 font-medium">Término</th>
                    <th className="py-2 text-right font-medium">Avanço</th>
                    <th className="py-2 text-right font-medium">Custo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda">
                  {visiveis.map((a) => (
                    <tr key={a.id} className={a.resumo ? "font-medium" : undefined}>
                      <td className="py-2 pr-3" style={{ paddingLeft: `${Math.max(a.nivel - 1, 0) * 12}px` }}>
                        {a.nome} {a.critica && !a.resumo && <Etiqueta tom="atencao">Crítica</Etiqueta>} {atrasada(a, hoje) && <Etiqueta tom="alerta">Atrasada</Etiqueta>}
                      </td>
                      <td className="py-2 tabular-nums">{dataCivil(a.inicio_previsto)}</td>
                      <td className="py-2 tabular-nums">{dataCivil(a.fim_previsto)}</td>
                      <td className="py-2 text-right tabular-nums">{pct(a.percentual)}</td>
                      <td className="py-2 text-right tabular-nums">{a.resumo ? "" : brl(a.custo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>
      )}

      <Cartao titulo="Arquivos acompanhados">
        <ul className="space-y-2 text-sm">
          {arquivos.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 truncate">{a.caminho.split("\\").at(-1)}</span>
              <span className="text-xs text-suave">
                {ROTULO_TIPO[a.papel]} · última leitura: {dataHora(a.ultima_leitura_em)}
              </span>
            </li>
          ))}
        </ul>
      </Cartao>

      {versoes.length > 0 && (
        <Cartao titulo="Versões">
          <ul className="space-y-3 text-sm">
            {versoes.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 truncate">{v.nome}</span>
                <span className="flex items-center gap-2 text-xs text-suave">
                  <Etiqueta tom={v.tipo === "vigente" ? "marca" : v.tipo === "reprogramacao" ? "atencao" : "neutro"}>{ROTULO_TIPO[v.tipo]}</Etiqueta>
                  {dataHora(v.importado_em)}
                </span>
                {v.tipo === "reprogramacao" && <BotaoLinhaBase acao={tornarLinhaBase.bind(null, v.id, id)} />}
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  );
}
