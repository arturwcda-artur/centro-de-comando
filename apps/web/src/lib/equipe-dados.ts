import "server-only";
import { CREDITO_POR_QUEM_MARCOU, QUADRO_EQUIPE, cartoesParados, detalharResolvidas, fluxoPorSemana, geracaoPorPessoa, rankingEvolucao, resumirEquipe, tarefasQueEntraram, type CartaoEquipe, type Geracao, type ItemCartao, type LinhaEquipe, type PosicaoEvolucao, type Resolvida } from "@/lib/equipe";
import { hojeSP, somarDias } from "@/lib/formato";
import { instanteSP, janelaAnterior, periodosParaFechar, podeFechar, type Janela, type TipoPeriodo } from "@/lib/placar";
import type { Json } from "@/lib/database.types";
import type { criarClienteServidor } from "@/lib/supabase/servidor";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

const LOTE_CARTOES = 150;
const PAGINA = 1000;

/** Cartões do quadro com itens e membros. A tela Equipe e o relatório KPI usam esta mesma leitura. */
export async function carregarCartoesEquipe(supabase: Cliente, quadro: string = QUADRO_EQUIPE) {
  const [membros, tarefas, conector] = await Promise.all([
    supabase.from("trello_membros").select("id, nome"),
    supabase
      .from("tarefas")
      .select("id, titulo, atualizado_em_origem, status, prazo, concluida_em, categoria, tarefa_membros(trello_membros(nome)), trello_cartao_datas(criado_em, concluido_em, prazo_original, prazo_alteracoes), cartoes_rotina(tarefa_id)")
      .eq("fonte", "trello")
      .like("categoria", `${quadro} › %`),
    supabase.from("conectores").select("ultima_sync_em").eq("ferramenta", "trello").maybeSingle(),
  ]);

  const lista = tarefas.data ?? [];
  const ids = lista.map((t) => t.id);
  // Em páginas: o servidor devolve no máximo 1.000 linhas por consulta e cortaria a conta em silêncio
  const itensChecklist = [];
  for (let i = 0; i < ids.length; i += LOTE_CARTOES) {
    const lote = ids.slice(i, i + LOTE_CARTOES);
    for (let de = 0; ; de += PAGINA) {
      const { data, error } = await supabase
        .from("trello_checklist_itens")
        .select("id, tarefa_id, nome, concluido, criado_no_trello, concluido_em, primeiro_concluido_em, atribuido:trello_membros!trello_checklist_itens_membro_id_fkey(nome), resolvedor:trello_membros!trello_checklist_itens_concluido_por_id_fkey(nome)")
        .in("tarefa_id", lote)
        .order("id")
        .range(de, de + PAGINA - 1);
      if (error) throw new Error(`itens de checklist: ${error.message}`);
      itensChecklist.push(...data);
      if (data.length < PAGINA) break;
    }
  }
  const itensDoCartao = new Map<string, ItemCartao[]>();
  for (const i of itensChecklist) {
    const item = { nome: i.nome, concluido: i.concluido, criado_em: i.criado_no_trello, concluido_em: i.primeiro_concluido_em ?? i.concluido_em, resolvido_por: i.resolvedor?.nome ?? null, responsaveis: i.atribuido ? [i.atribuido.nome] : [] };
    itensDoCartao.set(i.tarefa_id, [...(itensDoCartao.get(i.tarefa_id) ?? []), item]);
  }
  const cartoes = lista.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    ultima_atividade: t.atualizado_em_origem,
    status: t.status,
    prazo: t.prazo,
    categoria: t.categoria,
    criado_em: t.trello_cartao_datas?.criado_em ?? null,
    prazo_original: t.trello_cartao_datas?.prazo_original ?? null,
    prazo_alteracoes: t.trello_cartao_datas?.prazo_alteracoes ?? 0,
    concluido_em: t.trello_cartao_datas?.concluido_em ?? t.concluida_em,
    membros: t.tarefa_membros.map((m) => m.trello_membros.nome),
    rotina: !!t.cartoes_rotina,
    itens: itensDoCartao.get(t.id),
  }));
  return { cartoes, idMembro: new Map((membros.data ?? []).map((m) => [m.nome, m.id])), ultimaSync: conector.data?.ultima_sync_em ?? null };
}

/** Cartões criados, checklists e comentários do quadro da equipe, com o autor. */
export async function carregarGeracaoEquipe(supabase: Cliente, quadro: string = QUADRO_EQUIPE) {
  const [criacoes, comentarios] = await Promise.all([
    supabase.from("trello_criacoes").select("tipo, data, membro:trello_membros(nome), tarefas!inner(categoria)").like("tarefas.categoria", `${quadro} › %`),
    supabase.from("trello_comentarios").select("autor, data, tarefas!inner(categoria)").like("tarefas.categoria", `${quadro} › %`),
  ]);
  if (criacoes.error) throw new Error(criacoes.error.message);
  if (comentarios.error) throw new Error(comentarios.error.message);
  return {
    criacoes: (criacoes.data ?? []).map((c) => ({ nome: c.membro?.nome ?? null, tipo: c.tipo, data: c.data })),
    comentarios: (comentarios.data ?? []).map((c) => ({ nome: c.autor, data: c.data })),
  };
}


type DadosGeracao = Awaited<ReturnType<typeof carregarGeracaoEquipe>>;

/** Números de um período. É o que fica gravado no placar oficial (RN-49p). */
export type ResumoPlacar = {
  total: LinhaEquipe | null;
  porLista: LinhaEquipe[];
  porResponsavel: LinhaEquipe[];
  entraram: number;
  saldo: number;
  evolucaoEquipe: number | null;
  evolucaoPessoa: Record<string, number | null>;
  evolucaoLista: Record<string, number | null>;
  ranking: PosicaoEvolucao[] | null;
  resolvidasNoPeriodo: Record<string, Resolvida[]>;
  resolvidasAntes: Record<string, Resolvida[]> | null;
  geracao: Geracao[];
  evolucaoGeracao: Record<string, number | null>;
};

/**
 * Calcula o período. A comparação é com o placar oficial do período anterior, se houver;
 * senão, com o período anterior calculado agora.
 */
export function calcularPlacar(cartoes: CartaoEquipe[], geracaoDados: DadosGeracao, janela: Janela, anteriorOficial: ResumoPlacar | null, hoje: string): ResumoPlacar {
  const desde = instanteSP(janela.inicio);
  const ate = instanteSP(janela.fim);
  const atual = resumirEquipe(cartoes, hoje, desde, CREDITO_POR_QUEM_MARCOU, ate);
  const ant = janelaAnterior(janela);
  const [dAnt, aAnt] = [instanteSP(ant?.inicio ?? null), instanteSP(ant?.fim ?? null)];
  const anterior = anteriorOficial ?? (ant ? { ...resumirEquipe(cartoes, hoje, dAnt, CREDITO_POR_QUEM_MARCOU, aAnt), resolvidasNoPeriodo: Object.fromEntries(detalharResolvidas(cartoes, dAnt, aAnt)), geracao: geracaoPorPessoa(geracaoDados.criacoes, geracaoDados.comentarios, dAnt, aAnt) } : null);
  const temHistorico = (anterior?.total?.resolvidas ?? 0) > 0;
  const variacao = (agora: LinhaEquipe[], antes: LinhaEquipe[] | undefined) =>
    Object.fromEntries(agora.map((l) => [l.nome, temHistorico ? l.resolvidas - (antes?.find((a) => a.nome === l.nome)?.resolvidas ?? 0) : null]));
  const entraram = tarefasQueEntraram(cartoes, desde, CREDITO_POR_QUEM_MARCOU, ate);
  const geracao = geracaoPorPessoa(geracaoDados.criacoes, geracaoDados.comentarios, desde, ate);
  const temHistoricoGeracao = (anterior?.geracao ?? []).some((l) => l.total > 0);

  return {
    total: atual.total,
    porLista: atual.porLista,
    porResponsavel: atual.porResponsavel,
    entraram,
    saldo: (atual.total?.resolvidas ?? 0) - entraram,
    evolucaoEquipe: temHistorico ? (atual.total?.resolvidas ?? 0) - (anterior?.total?.resolvidas ?? 0) : null,
    evolucaoPessoa: variacao(atual.porResponsavel, anterior?.porResponsavel),
    evolucaoLista: variacao(atual.porLista, anterior?.porLista),
    ranking: temHistorico && anterior ? rankingEvolucao(atual.porResponsavel, anterior.porResponsavel) : null,
    resolvidasNoPeriodo: Object.fromEntries(detalharResolvidas(cartoes, desde, ate)),
    resolvidasAntes: anterior ? anterior.resolvidasNoPeriodo : null,
    geracao,
    evolucaoGeracao: Object.fromEntries(geracao.map((l) => [l.nome, temHistoricoGeracao ? l.total - (anterior?.geracao.find((a) => a.nome === l.nome)?.total ?? 0) : null])),
  };
}

type PlacarGravado = { tipo: TipoPeriodo; inicio: string; fim: string; fechado_em: string; dados: ResumoPlacar };

async function lerPlacares(supabase: Cliente, quadro: string): Promise<PlacarGravado[]> {
  const { data, error } = await supabase.from("equipe_placares").select("tipo, inicio, fim, fechado_em, dados").eq("quadro", quadro).order("inicio");
  if (error) throw new Error(`placares: ${error.message}`);
  return (data ?? []).map((p) => ({ ...p, tipo: p.tipo as TipoPeriodo, dados: p.dados as unknown as ResumoPlacar }));
}

/** Grava o placar oficial de cada semana e mês já fechados que ainda não têm placar. Nunca regrava. */
async function fecharPendentes(supabase: Cliente, quadro: string, cartoes: CartaoEquipe[], geracaoDados: DadosGeracao, gravados: PlacarGravado[], hoje: string) {
  const novos: PlacarGravado[] = [];
  for (const tipo of ["mes", "semana"] as const) {
    const doTipo = new Map(gravados.filter((p) => p.tipo === tipo).map((p) => [p.inicio, p.dados]));
    for (const j of periodosParaFechar(tipo, hoje)) {
      if (doTipo.has(j.inicio!)) continue;
      const anterior = doTipo.get(janelaAnterior(j)?.inicio ?? "") ?? null;
      // "Hoje" do placar é o último dia do período, para vencidas e prazos ficarem como estavam no fechamento
      const dados = calcularPlacar(cartoes, geracaoDados, j, anterior, somarDias(j.fim!, -1));
      const { error } = await supabase
        .from("equipe_placares")
        .upsert({ quadro, tipo, inicio: j.inicio!, fim: j.fim!, dados: dados as unknown as Json }, { onConflict: "quadro,tipo,inicio", ignoreDuplicates: true });
      if (error) throw new Error(`fechamento do placar: ${error.message}`);
      doTipo.set(j.inicio!, dados);
      novos.push({ tipo, inicio: j.inicio!, fim: j.fim!, fechado_em: new Date().toISOString(), dados });
    }
  }
  return novos;
}

export type Situacao = "oficial" | "parcial" | "aguardando" | "recalculado" | "todos";

/**
 * Tudo o que a tela Equipe e o relatório da equipe mostram para um período.
 * Período fechado mostra o placar gravado; o em andamento é calculado na hora (parcial).
 */
export async function painelDaEquipe(supabase: Cliente, quadro: string, janela: Janela) {
  const hoje = hojeSP();
  const [{ cartoes, idMembro, ultimaSync }, geracaoDados] = await Promise.all([carregarCartoesEquipe(supabase, quadro), carregarGeracaoEquipe(supabase, quadro)]);
  let gravados: PlacarGravado[] = [];
  let avisoPlacar: string | null = null;
  try {
    gravados = await lerPlacares(supabase, quadro);
    gravados = [...gravados, ...(await fecharPendentes(supabase, quadro, cartoes, geracaoDados, gravados, hoje))];
  } catch (e) {
    avisoPlacar = e instanceof Error ? e.message : "Não foi possível ler o placar oficial.";
  }
  const gravado = janela.tipo === "todos" ? undefined : gravados.find((p) => p.tipo === janela.tipo && p.inicio === janela.inicio);
  const anteriorOficial = janela.tipo === "todos" ? null : (gravados.find((p) => p.tipo === janela.tipo && p.inicio === janelaAnterior(janela)?.inicio)?.dados ?? null);
  const situacao: Situacao = janela.tipo === "todos" ? "todos" : gravado ? "oficial" : !janela.fim || hoje < janela.fim ? "parcial" : podeFechar(janela, hoje) ? "recalculado" : "aguardando";

  return {
    janela,
    situacao,
    fechadoEm: gravado?.fechado_em ?? null,
    resumo: gravado?.dados ?? calcularPlacar(cartoes, geracaoDados, janela, anteriorOficial, hoje),
    oficiais: gravados.map((p) => ({ tipo: p.tipo, inicio: p.inicio, fim: p.fim })).reverse(),
    avisoPlacar,
    idMembro,
    ultimaSync,
    parados: cartoesParados(cartoes, new Date()),
    semanas: fluxoPorSemana(cartoes, hoje),
  };
}
