/**
 * Conector Trello — SOMENTE LEITURA (só requisições GET; ADR 0005 e 0012).
 * Fonte oficial das tarefas operacionais de equipe (ADR 0004).
 */
import { buscar, cortar, dataSP } from './util.js';

const API = 'https://api.trello.com/1';
export const PESSOA_EQUIPE = 'Equipe (Trello)';
/** Único quadro com membros, comentários, checklists e arquivados (ADR 0017). */
export const QUADRO_DETALHADO = 'Obras do Grupo - C.SALLES';
const LOTE = 200;

function chamar(caminho, { chave, token }, params = {}) {
  const qs = new URLSearchParams({ ...params, key: chave, token });
  return buscar(`${API}${caminho}?${qs}`, { headers: { Accept: 'application/json' } }, `Trello ${caminho.split('/')[1]}`).then((r) => r.json());
}

/**
 * Listas que nunca entram no sistema (RN-66): credenciais não devem ser copiadas para o banco,
 * o histórico de auditoria ou os backups. Os cartões seguem intactos no Trello.
 */
export function listaSensivel(nomeLista) {
  const n = (nomeLista ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return /senha|password|credencia|\blogin|\btoken/.test(n);
}

/** Cartão com credencial escrita no título ou na descrição (ex.: "senha: ...") também não é importado (RN-66). */
export function cartaoSensivel(cartao) {
  return /(senha|password|pass|pin)\s*[:=]/i.test(`${cartao.name ?? ''} ${cartao.desc ?? ''}`);
}

/** Comentário ou item de checklist com credencial escrita também não é copiado (RN-66). */
export function textoSensivel(texto) {
  return /(senha|password|pass|pin)\s*[:=]/i.test(texto ?? '');
}

/** Situação a partir da lista em que o cartão está (o nome da lista é a convenção do quadro). */
export function statusDaLista(nomeLista) {
  const n = (nomeLista ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (/conclu|feito|finaliz|entregue|\bdone\b/.test(n)) return 'concluida';
  if (/andamento|fazendo|execu|doing|progresso/.test(n)) return 'em_andamento';
  return 'a_fazer';
}

/**
 * Cartão → tarefa espelho.
 * Cartões em que o proprietário é membro (ou sem membros) ficam sem responsável = "minhas" (RN-45);
 * os demais vão para a pessoa "Equipe (Trello)", para não lotar "Minhas atribuições".
 */
export function mapearCartao(cartao, { quadro, lista, meuId, idEquipe }) {
  const status = cartao.dueComplete ? 'concluida' : statusDaLista(lista);
  const meu = !cartao.idMembers?.length || cartao.idMembers.includes(meuId);
  return {
    id_externo: cartao.id,
    titulo: cortar(cartao.name, 300) ?? '(cartão sem título)',
    descricao: cortar([cartao.desc, cartao.url].filter(Boolean).join('\n\n'), 4000),
    prazo: dataSP(cartao.due),
    status,
    concluida_em: status === 'concluida' ? (cartao.dateLastActivity ?? new Date().toISOString()) : null,
    categoria: cortar(`${quadro} › ${lista ?? '—'}`, 100),
    responsavel_id: meu ? null : idEquipe,
    atualizado_em_origem: cartao.dateLastActivity ?? null,
  };
}

/** No quadro detalhado, o arquivado só conta se estava concluído: entra na produção da equipe. */
export function cartaoImportavel(cartao, lista) {
  return !cartao.closed || !!cartao.dueComplete || statusDaLista(lista) === 'concluida';
}

async function lerAcoes(credenciais, idQuadro, filter) {
  const acoes = [];
  let antes;
  for (;;) {
    const params = { filter, limit: '1000', fields: 'data,date', memberCreator_fields: 'fullName', ...(antes ? { before: antes } : {}) };
    const pagina = await chamar(`/boards/${idQuadro}/actions`, credenciais, params);
    acoes.push(...pagina);
    if (pagina.length < 1000) return acoes;
    antes = pagina.at(-1).id;
  }
}

/** O id do Trello começa com o instante da criação do cartão, em segundos e hexadecimal. */
export function criacaoDoCartao(idCartao) {
  return new Date(parseInt(idCartao.slice(0, 8), 16) * 1000).toISOString();
}

/** Última vez que cada cartão entrou numa lista de concluídos ou foi marcado como concluído. */
export function conclusoesDoHistorico(acoes) {
  const datas = new Map();
  for (const a of acoes) {
    const entrouEmConcluidos = a.data?.listAfter && statusDaLista(a.data.listAfter.name) === 'concluida';
    const marcou = a.data?.card?.dueComplete === true && a.data?.old?.dueComplete === false;
    if (!entrouEmConcluidos && !marcou) continue;
    const id = a.data.card.id;
    if (!datas.has(id) || a.date > datas.get(id)) datas.set(id, a.date);
  }
  return datas;
}

/** Primeira data de entrega de cada cartão e quantas vezes uma data existente foi mudada ou retirada. */
export function prazosDoHistorico(acoes) {
  const mudancas = acoes.filter((a) => a.data?.old && 'due' in a.data.old && a.data.card?.id).sort((a, b) => a.date.localeCompare(b.date));
  const prazos = new Map();
  for (const a of mudancas) {
    const id = a.data.card.id;
    const atual = prazos.get(id) ?? { original: a.data.old.due ?? a.data.card.due ?? null, alteracoes: 0 };
    if (a.data.old.due && a.data.old.due !== a.data.card.due) atual.alteracoes += 1;
    prazos.set(id, atual);
  }
  return prazos;
}

/** Sem registro no histórico (cartão criado já concluído), fica a última atividade. */
export function datasDoCartao(cartao, lista, conclusoes, prazos = new Map()) {
  const concluido = !!cartao.dueComplete || statusDaLista(lista) === 'concluida';
  const prazo = prazos.get(cartao.id);
  return {
    cartao: cartao.id,
    criado_em: criacaoDoCartao(cartao.id),
    concluido_em: concluido ? (conclusoes.get(cartao.id) ?? cartao.dateLastActivity ?? null) : null,
    prazo_original: dataSP(prazo?.original ?? cartao.due),
    prazo_alteracoes: prazo?.alteracoes ?? 0,
  };
}

/** Última vez que cada item de checklist foi marcado como concluído. */
export function conclusoesDeItens(acoes) {
  const datas = new Map();
  for (const a of acoes) {
    const item = a.data?.checkItem;
    if (item?.state !== 'complete') continue;
    if (!datas.has(item.id) || a.date > datas.get(item.id)) datas.set(item.id, a.date);
  }
  return datas;
}

/** Lê por quadro, sem uma chamada por cartão. Texto com credencial fica de fora (RN-66). */
export async function lerDetalhes(credenciais, idQuadro) {
  const [membros, checklists, comentarios, marcacoes] = await Promise.all([
    chamar(`/boards/${idQuadro}/members`, credenciais, { fields: 'fullName,username' }),
    chamar(`/boards/${idQuadro}/checklists`, credenciais, { fields: 'name,idCard', checkItems: 'all', checkItem_fields: 'name,state,pos,idMember' }),
    lerAcoes(credenciais, idQuadro, 'commentCard'),
    lerAcoes(credenciais, idQuadro, 'updateCheckItemStateOnCard'),
  ]);
  const concluidos = conclusoesDeItens(marcacoes);
  return {
    membros: membros.map((m) => ({ id_externo: m.id, nome: m.fullName, usuario: m.username ?? null })),
    itens: checklists.flatMap((l) =>
      (l.checkItems ?? [])
        .filter((i) => !textoSensivel(i.name) && !textoSensivel(l.name))
        .map((i) => {
          const concluido = i.state === 'complete';
          return {
            id_externo: i.id,
            cartao: l.idCard,
            checklist: l.name,
            nome: i.name,
            concluido,
            posicao: i.pos ?? 0,
            membro: i.idMember ?? null,
            criado_no_trello: criacaoDoCartao(i.id),
            concluido_em: concluido ? (concluidos.get(i.id) ?? null) : null,
          };
        }),
    ),
    comentarios: comentarios
      .filter((a) => a.data?.text && !textoSensivel(a.data.text))
      .map((a) => ({ id_externo: a.id, cartao: a.data.card?.id, autor: a.memberCreator?.fullName ?? null, texto: a.data.text, data: a.date })),
  };
}

async function gravarLotes(supabase, tabela, linhas, onConflict) {
  for (let i = 0; i < linhas.length; i += LOTE) {
    const { error } = await supabase.from(tabela).upsert(linhas.slice(i, i + LOTE), { onConflict });
    if (error) throw new Error(`gravação em ${tabela}: ${error.message}`);
  }
}

/** Espelho fiel: o que sumiu do Trello, ou passou a ser sensível, sai daqui também. */
async function retirarAusentes(supabase, tabela, presentes) {
  const { data, error } = await supabase.from(tabela).select('id, id_externo');
  if (error) throw new Error(`leitura de ${tabela}: ${error.message}`);
  const ausentes = data.filter((r) => !presentes.has(r.id_externo)).map((r) => r.id);
  for (let i = 0; i < ausentes.length; i += LOTE) {
    const { error: e } = await supabase.from(tabela).delete().in('id', ausentes.slice(i, i + LOTE));
    if (e) throw new Error(`limpeza de ${tabela}: ${e.message}`);
  }
}

/** Grava membros, vínculos, comentários e checklists dos cartões já importados. */
export async function aplicarDetalhes(supabase, { membros, vinculos, comentarios, itens, datas = [] }) {
  // Em lotes pelos ids: uma consulta só pararia no limite de linhas da API
  const cartoes = [...new Set([...vinculos, ...comentarios, ...itens, ...datas].map((x) => x.cartao).filter(Boolean))];
  const idTarefa = new Map();
  for (let i = 0; i < cartoes.length; i += LOTE) {
    const { data, error } = await supabase.from('tarefas').select('id, id_externo').eq('fonte', 'trello').in('id_externo', cartoes.slice(i, i + LOTE));
    if (error) throw new Error(`leitura de tarefas: ${error.message}`);
    for (const t of data) idTarefa.set(t.id_externo, t.id);
  }

  await gravarLotes(supabase, 'trello_membros', membros, 'id_externo');
  const { data: gravados, error: e1 } = await supabase.from('trello_membros').select('id, id_externo');
  if (e1) throw new Error(`leitura de membros: ${e1.message}`);
  const idMembro = new Map(gravados.map((m) => [m.id_externo, m.id]));

  const desejados = new Map();
  for (const v of vinculos) {
    const tarefa_id = idTarefa.get(v.cartao);
    const membro_id = idMembro.get(v.membro);
    if (tarefa_id && membro_id) desejados.set(`${tarefa_id}|${membro_id}`, { tarefa_id, membro_id });
  }
  const { data: atuais, error: e2 } = await supabase.from('tarefa_membros').select('tarefa_id, membro_id');
  if (e2) throw new Error(`leitura de vínculos: ${e2.message}`);
  const existentes = new Set(atuais.map((a) => `${a.tarefa_id}|${a.membro_id}`));
  const novos = [...desejados].filter(([k]) => !existentes.has(k)).map(([, v]) => v);
  if (novos.length) {
    const { error: e3 } = await supabase.from('tarefa_membros').insert(novos);
    if (e3) throw new Error(`gravação de vínculos: ${e3.message}`);
  }
  for (const a of atuais) {
    if (desejados.has(`${a.tarefa_id}|${a.membro_id}`)) continue;
    const { error: e4 } = await supabase.from('tarefa_membros').delete().eq('tarefa_id', a.tarefa_id).eq('membro_id', a.membro_id);
    if (e4) throw new Error(`limpeza de vínculos: ${e4.message}`);
  }

  const ligar = (lista) => lista.filter((x) => idTarefa.has(x.cartao)).map(({ cartao, ...resto }) => ({ ...resto, tarefa_id: idTarefa.get(cartao) }));
  const linhasComentarios = ligar(comentarios);
  const linhasItens = ligar(itens).map(({ membro, ...resto }) => ({ ...resto, membro_id: idMembro.get(membro) ?? null }));
  const linhasDatas = datas.filter((d) => idTarefa.has(d.cartao)).map(({ cartao, ...resto }) => ({ ...resto, tarefa_id: idTarefa.get(cartao) }));
  await gravarLotes(supabase, 'trello_cartao_datas', linhasDatas, 'tarefa_id');
  await gravarLotes(supabase, 'trello_comentarios', linhasComentarios, 'id_externo');
  await gravarLotes(supabase, 'trello_checklist_itens', linhasItens, 'id_externo');
  await retirarAusentes(supabase, 'trello_comentarios', new Set(linhasComentarios.map((c) => c.id_externo)));
  await retirarAusentes(supabase, 'trello_checklist_itens', new Set(linhasItens.map((c) => c.id_externo)));
  return { membros: membros.length, comentarios: linhasComentarios.length, itens: linhasItens.length };
}

/** Lê todos os quadros abertos do usuário e devolve as tarefas mapeadas. */
export async function lerTrello(credenciais, { idEquipe }) {
  const eu = await chamar('/members/me', credenciais, { fields: 'id' });
  const quadros = await chamar('/members/me/boards', credenciais, { filter: 'open', fields: 'name' });
  const registros = [];
  let detalhes = null;
  for (const q of quadros) {
    const detalhado = q.name === QUADRO_DETALHADO;
    const [listas, cartoes] = await Promise.all([
      chamar(`/boards/${q.id}/lists`, credenciais, { fields: 'name', filter: 'all' }),
      chamar(`/boards/${q.id}/cards`, credenciais, { filter: detalhado ? 'all' : 'open', fields: 'name,desc,due,dueComplete,idList,idMembers,url,dateLastActivity,closed' }),
    ]);
    const nomeLista = new Map(listas.map((l) => [l.id, l.name]));
    const importados = [];
    for (const c of cartoes) {
      const lista = nomeLista.get(c.idList);
      if (listaSensivel(lista) || cartaoSensivel(c) || !cartaoImportavel(c, lista)) continue;
      registros.push(mapearCartao(c, { quadro: q.name, lista, meuId: eu.id, idEquipe }));
      importados.push(c);
    }
    if (detalhado) {
      const vinculos = importados.flatMap((c) => (c.idMembers ?? []).map((membro) => ({ cartao: c.id, membro })));
      const historico = await lerAcoes(credenciais, q.id, 'updateCard');
      const conclusoes = conclusoesDoHistorico(historico);
      const prazos = prazosDoHistorico(historico);
      const datas = importados.map((c) => datasDoCartao(c, nomeLista.get(c.idList), conclusoes, prazos));
      detalhes = { ...(await lerDetalhes(credenciais, q.id)), vinculos, datas };
    }
  }
  return { registros, quadros: quadros.length, detalhes };
}

/** Garante a pessoa "Equipe (Trello)" usada nos cartões atribuídos a outros membros. */
export async function idPessoaEquipe(supabase) {
  const { data } = await supabase.from('pessoas').select('id').eq('nome', PESSOA_EQUIPE).is('arquivado_em', null).limit(1).maybeSingle();
  if (data) return data.id;
  const { data: nova, error } = await supabase.from('pessoas').insert({ nome: PESSOA_EQUIPE, funcao: 'Cartões do Trello atribuídos a outros membros' }).select('id').single();
  if (error) throw new Error(`pessoa da equipe: ${error.message}`);
  return nova.id;
}

/**
 * Cartões que deixaram de existir entre os abertos (arquivados/excluídos no Trello)
 * viram "cancelada" no espelho — nunca são apagados.
 */
export async function cancelarAusentes(supabase, idsPresentes) {
  const { data, error } = await supabase.from('tarefas').select('id, id_externo').eq('fonte', 'trello').not('status', 'in', '(concluida,cancelada)');
  if (error) throw new Error(`leitura de tarefas do Trello: ${error.message}`);
  const presentes = new Set(idsPresentes);
  const ausentes = data.filter((t) => !presentes.has(t.id_externo)).map((t) => t.id);
  if (ausentes.length) {
    // hash nulo: se o cartão voltar (desarquivado), a próxima sincronização o regrava
    const { error: e2 } = await supabase.from('tarefas').update({ status: 'cancelada', status_sync: 'sincronizado', hash_conteudo: null }).in('id', ausentes);
    if (e2) throw new Error(`cancelamento de cartões ausentes: ${e2.message}`);
  }
  return ausentes.length;
}
