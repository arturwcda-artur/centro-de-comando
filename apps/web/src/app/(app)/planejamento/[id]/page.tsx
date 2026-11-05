import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GraficoCurvaS } from "@/components/grafico-curva-s";
import { Aviso, Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { atrasada, diferencaEmDias } from "@/lib/curva-s";
import { brl, dataCivil, dataHora, hojeSP, pct } from "@/lib/formato";
import { UUID } from "@/lib/obras";
import { carregarPlanejamentoObra } from "@/lib/planejamento";
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
  const dados = await carregarPlanejamentoObra(supabase, id);
  if (!dados) notFound();
  const { obra, arquivos, versoes, arquivoVigente, vigente, listaVigente, inicio, partida, anterior, executado, avanco, termino, terminoBase, limite, series, avisos } = dados;
  const hoje = hojeSP();

  const visiveis = listaVigente.filter((a) => (filtro === "criticas" ? a.critica && !a.resumo : filtro === "atrasadas" ? atrasada(a, hoje) : true));

  return (
    <div className="space-y-5">
      <div>
        <Link href="/planejamento" className="text-sm text-suave hover:text-texto">
          ← Planejamento
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{obra.codigo}</h1>
        <p className="text-sm text-suave">{vigente ? `Cronograma vigente: ${vigente.nome}` : "Aguardando a primeira leitura dos cronogramas."}</p>
        <Link href={`/documentos?obra=${id}&categoria=planejamento`} className="text-sm text-marca hover:underline">
          Documentos de planejamento
        </Link>
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
