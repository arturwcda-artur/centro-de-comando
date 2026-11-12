import "server-only";
import { CREDITO_POR_QUEM_MARCOU, QUADRO_EQUIPE, cartoesParados, detalharResolvidas, fluxoPorSemana, geracaoPorPessoa, rankingEvolucao, resumirEquipe, tarefasQueEntraram, type ItemCartao, type LinhaEquipe } from "@/lib/equipe";
import { hojeSP, somarDias } from "@/lib/formato";
import type { criarClienteServidor } from "@/lib/supabase/servidor";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

export const PERIODOS = [
  { valor: "30", rotulo: "Último mês", dias: 30 },
  { valor: "7", rotulo: "Última semana", dias: 7 },
  { valor: "todos", rotulo: "Todo o período", dias: null },
];

export const periodoDe = (valor: unknown) => PERIODOS.find((p) => p.valor === valor) ?? PERIODOS[0];

/** Cartões do quadro com itens e membros. A tela Equipe e o relatório KPI usam esta mesma leitura. */
export async function carregarCartoesEquipe(supabase: Cliente) {
  const [membros, tarefas, conector] = await Promise.all([
    supabase.from("trello_membros").select("id, nome"),
    supabase
      .from("tarefas")
      .select("id, titulo, atualizado_em_origem, status, prazo, concluida_em, categoria, tarefa_membros(trello_membros(nome)), trello_cartao_datas(criado_em, concluido_em, prazo_original, prazo_alteracoes), cartoes_rotina(tarefa_id)")
      .eq("fonte", "trello")
      .like("categoria", `${QUADRO_EQUIPE} › %`),
    supabase.from("conectores").select("ultima_sync_em").eq("ferramenta", "trello").maybeSingle(),
  ]);

  const lista = tarefas.data ?? [];
  const ids = lista.map((t) => t.id);
  const { data: itensChecklist } = ids.length
    ? await supabase.from("trello_checklist_itens").select("tarefa_id, nome, concluido, criado_no_trello, concluido_em, atribuido:trello_membros!trello_checklist_itens_membro_id_fkey(nome), resolvedor:trello_membros!trello_checklist_itens_concluido_por_id_fkey(nome)").in("tarefa_id", ids).limit(5000)
    : { data: [] };
  const itensDoCartao = new Map<string, ItemCartao[]>();
  for (const i of itensChecklist ?? []) {
    const item = { nome: i.nome, concluido: i.concluido, criado_em: i.criado_no_trello, concluido_em: i.concluido_em, resolvido_por: i.resolvedor?.nome ?? null, responsaveis: i.atribuido ? [i.atribuido.nome] : [] };
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
export async function carregarGeracaoEquipe(supabase: Cliente) {
  const [criacoes, comentarios] = await Promise.all([
    supabase.from("trello_criacoes").select("tipo, data, membro:trello_membros(nome)"),
    supabase.from("trello_comentarios").select("autor, data, tarefas!inner(categoria)").like("tarefas.categoria", `${QUADRO_EQUIPE} › %`),
  ]);
  if (criacoes.error) throw new Error(criacoes.error.message);
  if (comentarios.error) throw new Error(comentarios.error.message);
  return {
    criacoes: (criacoes.data ?? []).map((c) => ({ nome: c.membro?.nome ?? null, tipo: c.tipo, data: c.data })),
    comentarios: (comentarios.data ?? []).map((c) => ({ nome: c.autor, data: c.data })),
  };
}

/** Quem gerou atividade no período e no período anterior, para mostrar a evolução. */
export function montarGeracao(dados: Awaited<ReturnType<typeof carregarGeracaoEquipe>>, dias: number | null) {
  const hoje = hojeSP();
  const desde = dias ? somarDias(hoje, -dias) : undefined;
  const atual = geracaoPorPessoa(dados.criacoes, dados.comentarios, desde);
  const anterior = dias && desde ? geracaoPorPessoa(dados.criacoes, dados.comentarios, somarDias(hoje, -2 * dias), desde) : null;
  const temHistorico = (anterior ?? []).some((l) => l.total > 0);
  return { atual, evolucao: (nome: string, total: number) => (temHistorico ? total - (anterior?.find((l) => l.nome === nome)?.total ?? 0) : null) };
}

/** Todos os números do painel, para um período. */
export function montarPainelEquipe(cartoes: Awaited<ReturnType<typeof carregarCartoesEquipe>>["cartoes"], dias: number | null) {
  const hoje = hojeSP();
  const desde = dias ? somarDias(hoje, -dias) : undefined;
  const { total, porLista, porResponsavel } = resumirEquipe(cartoes, hoje, desde);

  // Comparação com o período anterior, de mesmo tamanho. Sem entregas nele, ainda não há histórico
  const anterior = dias && desde ? resumirEquipe(cartoes, hoje, somarDias(hoje, -2 * dias), CREDITO_POR_QUEM_MARCOU, desde) : null;
  const temHistorico = (anterior?.total?.resolvidas ?? 0) > 0;
  const variacao = (linhas: LinhaEquipe[] | undefined) => (nome: string, atual: number) => (temHistorico ? atual - (linhas?.find((l) => l.nome === nome)?.resolvidas ?? 0) : null);
  const entraram = tarefasQueEntraram(cartoes, desde);

  return {
    total,
    porLista,
    porResponsavel,
    entraram,
    saldo: (total?.resolvidas ?? 0) - entraram,
    evolucaoEquipe: temHistorico ? (total?.resolvidas ?? 0) - (anterior?.total?.resolvidas ?? 0) : null,
    evolucaoPessoa: variacao(anterior?.porResponsavel),
    evolucaoLista: variacao(anterior?.porLista),
    ranking: temHistorico && anterior ? rankingEvolucao(porResponsavel, anterior.porResponsavel) : null,
    resolvidasNoPeriodo: detalharResolvidas(cartoes, desde),
    resolvidasAntes: dias && desde ? detalharResolvidas(cartoes, somarDias(hoje, -2 * dias), desde) : null,
    parados: cartoesParados(cartoes, new Date()),
    semanas: fluxoPorSemana(cartoes, hoje),
  };
}
