/**
 * Conferência da nova revisão (RN-49o). Quando a obra ganha um cronograma vigente novo depois de uma
 * alteração aprovada no cérebro do planejamento (RN-49n), compara a revisão com o que a rota previa:
 * a atividade alterada e o término da obra. Conforme: a tarefa "Atualizar o cronograma" é concluída.
 * Divergente: a tarefa continua aberta com o que ficou diferente. Só lê o cronograma; nunca o altera.
 */

/** Diferença aceita, em dias corridos: o cérebro usa dias úteis de segunda a sexta e o Project, o calendário da obra. */
export const TOLERANCIA_DIAS = 3;

const dataBR = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
const dias = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);

/** Compara a avaliação aprovada com a atividade e o término lidos na nova revisão. */
export function compararRevisao(avaliacao, alvo, termino) {
  const diferencas = [];
  const nome = avaliacao.atividade_nome ?? 'atividade alterada';
  if (!alvo) diferencas.push(`A atividade ${nome} não foi encontrada na nova revisão.`);
  else {
    for (const [campo, esperado, real] of [
      ['início', avaliacao.inicio_esperado, alvo.inicio_previsto],
      ['fim', avaliacao.fim_esperado, alvo.fim_previsto],
    ]) {
      if (esperado && real && Math.abs(dias(esperado, real)) > TOLERANCIA_DIAS) diferencas.push(`${nome}: ${campo} esperado ${dataBR(esperado)}, na revisão ${dataBR(real)}.`);
    }
  }
  if (avaliacao.termino_depois && termino && Math.abs(dias(avaliacao.termino_depois, termino)) > TOLERANCIA_DIAS)
    diferencas.push(`Término da obra esperado ${dataBR(avaliacao.termino_depois)}, na revisão ${dataBR(termino)} (${dias(avaliacao.termino_depois, termino) > 0 ? '+' : ''}${dias(avaliacao.termino_depois, termino)} dias corridos).`);
  return diferencas.length
    ? { conferencia: 'divergente', detalhe: diferencas.join(' ') }
    : { conferencia: 'conforme', detalhe: `A revisão ficou como a rota aprovada (tolerância de ${TOLERANCIA_DIAS} dias corridos).` };
}

export async function conferirRevisoes(supabase) {
  const { data: avaliacoes, error } = await supabase
    .from('avaliacoes_planejamento')
    .select('id, decisao_id, obra_id, versao_id, atividade_uid, atividade_nome, inicio_esperado, fim_esperado, termino_depois, decidido_em')
    .eq('situacao', 'aprovada')
    .is('conferida_em', null)
    .not('obra_id', 'is', null);
  if (error) throw new Error(`leitura das avaliações: ${error.message}`);

  const r = { conformes: 0, divergentes: 0, aguardando: 0 };
  for (const av of avaliacoes) {
    const { data: vigente } = await supabase.from('cronograma_versoes').select('id, nome, importado_em').eq('obra_id', av.obra_id).eq('tipo', 'vigente').maybeSingle();
    // Só conta revisão lida depois da aprovação
    if (!vigente || vigente.id === av.versao_id || (vigente.importado_em ?? '') < av.decidido_em) {
      r.aguardando += 1;
      continue;
    }
    const [{ data: alvo }, { data: ultimas }] = await Promise.all([
      av.atividade_uid === null
        ? Promise.resolve({ data: null })
        : supabase.from('atividades_cronograma').select('inicio_previsto, fim_previsto').eq('versao_id', vigente.id).eq('uid_project', av.atividade_uid).maybeSingle(),
      supabase.from('atividades_cronograma').select('fim_previsto').eq('versao_id', vigente.id).eq('resumo', false).eq('marco', false).not('fim_previsto', 'is', null).order('fim_previsto', { ascending: false }).limit(1),
    ]);
    const resultado = compararRevisao(av, alvo, ultimas?.[0]?.fim_previsto ?? null);
    const { error: e1 } = await supabase
      .from('avaliacoes_planejamento')
      .update({ versao_conferida_id: vigente.id, conferencia: resultado.conferencia, conferencia_detalhe: resultado.detalhe, conferida_em: new Date().toISOString() })
      .eq('id', av.id);
    if (e1) throw new Error(`gravação da conferência: ${e1.message}`);

    const { data: decisao } = await supabase.from('decisoes').select('tarefa_planejamento_id').eq('id', av.decisao_id).maybeSingle();
    const tarefaId = decisao?.tarefa_planejamento_id;
    if (tarefaId) {
      const { data: tarefa } = await supabase.from('tarefas').select('descricao, status').eq('id', tarefaId).maybeSingle();
      if (tarefa && tarefa.status !== 'concluida' && tarefa.status !== 'cancelada') {
        const nota = `Conferência da revisão ${vigente.nome}: ${resultado.conferencia === 'conforme' ? 'conforme' : 'divergente'}. ${resultado.detalhe}`;
        const descricao = `${nota}\n\n${tarefa.descricao ?? ''}`.slice(0, 4000);
        const campos = resultado.conferencia === 'conforme' ? { descricao, status: 'concluida', concluida_em: new Date().toISOString() } : { descricao };
        const { error: e2 } = await supabase.from('tarefas').update(campos).eq('id', tarefaId).eq('fonte', 'manual');
        if (e2) throw new Error(`atualização da tarefa: ${e2.message}`);
      }
    }
    r[resultado.conferencia === 'conforme' ? 'conformes' : 'divergentes'] += 1;
  }
  return r;
}
