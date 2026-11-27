/**
 * Ficha de prontidão da obra (Doutrina do Centro de Comando, RN-49r): o que precisa existir e estar
 * atualizado para a obra em execução, conferido sozinho com os dados do sistema. Mostra o que falta
 * e o que venceu. Sem banco, para poder testar.
 */

/** Piloto da ficha (27/11/2026). As faltas destas obras sobem para a Mesa. */
export const OBRAS_PILOTO = ["PRF-RECANTO"];

export type Situacao = "ok" | "atencao" | "vencido" | "falta";
export type Area = "Contrato" | "Prazo" | "Medição" | "Documentação" | "Problemas";
export type ItemProntidao = { chave: string; area: Area; titulo: string; situacao: Situacao; detalhe: string };

export type DadosProntidao = {
  hoje: string;
  situacaoObra: string;
  contrato: { numero: string | null; termino: string | null } | null;
  aditivos: { numero: string | null; situacao: string; tipo: string; desde: string }[];
  arquivos: { papel: string; erro: boolean }[];
  vigente: { atualizado: string | null; termino: string | null; atrasadas: number; atrasadasCriticas: number } | null;
  medicoes: { numero: string | null; periodoFim: string | null; situacao: string; dataEnvio: string | null }[];
  documentos: { ultimoDiario: string | null; equipe: number; art: number; revisar: number };
  problemasCriticos: number;
};

/** Validade de cada informação (Doutrina: Sala de Situação). */
export const VALIDADE = { cronogramaDias: 7, diarioDias: 4, aditivoDias: 30 };

const br = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const diasEntre = (de: string, ate: string) => Math.round((Date.parse(ate.slice(0, 10)) - Date.parse(de.slice(0, 10))) / 864e5);
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Último mês fechado que já precisa ter medição: o anterior, ou o retrasado até o dia 5. */
export function mesQueDeveTerMedicao(hoje: string): string {
  const [a, m, d] = hoje.split("-").map(Number);
  const voltar = d <= 5 ? 2 : 1;
  const total = a * 12 + (m - 1) - voltar;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function avaliarProntidao(d: DadosProntidao): ItemProntidao[] {
  const itens: ItemProntidao[] = [];
  const add = (chave: string, area: Area, titulo: string, situacao: Situacao, detalhe: string) => itens.push({ chave, area, titulo, situacao, detalhe });
  const emExecucao = d.situacaoObra === "andamento";

  // Contrato
  if (!d.contrato) add("contrato", "Contrato", "Contrato cadastrado", "falta", "Nenhum contrato cadastrado para a obra.");
  else add("contrato", "Contrato", "Contrato cadastrado", "ok", `Contrato ${d.contrato.numero ?? ""}, término ${br(d.contrato.termino)}.`.replace("  ", " "));
  for (const a of d.aditivos.filter((x) => x.situacao === "em_analise")) {
    const dias = diasEntre(a.desde, d.hoje);
    add(`aditivo:${a.numero}`, "Contrato", `Aditivo ${a.numero ?? ""} em análise`.replace("  ", " "), dias > VALIDADE.aditivoDias ? "vencido" : "atencao", `Em análise há ${plural(dias, "dia", "dias")} (${a.tipo}).`);
  }

  // Prazo
  const vigente = d.arquivos.some((x) => x.papel === "vigente");
  const base = d.arquivos.some((x) => x.papel === "linha_base");
  add("cronograma", "Prazo", "Cronograma vigente cadastrado", vigente ? "ok" : "falta", vigente ? "Arquivo em VALIDOS acompanhado pelo agente." : "Cadastre o cronograma vigente da obra (pasta VALIDOS).");
  add("linha-base", "Prazo", "Linha de base cadastrada", base ? "ok" : "falta", base ? "Planejamento aprovado guardado para comparação." : "Cadastre a linha de base (planejamento aprovado).");
  if (d.arquivos.some((x) => x.erro)) add("leitura", "Prazo", "Leitura do cronograma", "falta", "O agente não conseguiu ler um dos arquivos de cronograma. Veja em Planejamento.");
  if (d.vigente) {
    const idade = d.vigente.atualizado ? diasEntre(d.vigente.atualizado, d.hoje) : null;
    if (emExecucao)
      add("cronograma-atualizado", "Prazo", "Cronograma atualizado na semana", idade !== null && idade <= VALIDADE.cronogramaDias ? "ok" : "vencido", idade === null ? "Sem data de alteração do arquivo." : `Arquivo alterado em ${br(d.vigente.atualizado)} (há ${plural(idade, "dia", "dias")}).`);
    if (d.contrato?.termino && d.vigente.termino && d.vigente.termino > d.contrato.termino) {
      const dias = diasEntre(d.contrato.termino, d.vigente.termino);
      add("prazo-contratual", "Prazo", "Cronograma dentro do prazo do contrato", "falta", `O cronograma vigente termina em ${br(d.vigente.termino)}, ${plural(dias, "dia", "dias")} depois do contrato (${br(d.contrato.termino)}). Precisa de aditivo de prazo ou replanejamento.`);
    } else if (d.contrato?.termino && d.vigente.termino) add("prazo-contratual", "Prazo", "Cronograma dentro do prazo do contrato", "ok", `Termina em ${br(d.vigente.termino)}; contrato até ${br(d.contrato.termino)}.`);
    if (d.vigente.atrasadasCriticas > 0) add("atrasadas", "Prazo", "Atividades do caminho crítico em dia", "falta", `${plural(d.vigente.atrasadasCriticas, "atividade crítica passou", "atividades críticas passaram")} do fim previsto sem concluir.`);
    else if (d.vigente.atrasadas > 0) add("atrasadas", "Prazo", "Atividades em dia", "atencao", `${plural(d.vigente.atrasadas, "atividade passou", "atividades passaram")} do fim previsto sem concluir (fora do caminho crítico).`);
  }

  // Medição
  if (emExecucao && d.contrato) {
    const mes = mesQueDeveTerMedicao(d.hoje);
    const ultima = d.medicoes.filter((m) => m.periodoFim).sort((a, b) => b.periodoFim!.localeCompare(a.periodoFim!))[0];
    const emDia = !!ultima && ultima.periodoFim!.slice(0, 7) >= mes;
    add("medicao-mes", "Medição", "Medição do mês", emDia ? "ok" : "falta", ultima ? `Última medição (nº ${ultima.numero ?? "—"}) cobre até ${br(ultima.periodoFim)}; ${emDia ? "em dia" : `falta a medição de ${mes.split("-").reverse().join("/")}`}.` : "Nenhuma medição cadastrada.");
    const semEnvio = d.medicoes.filter((m) => (m.situacao === "aprovada" || m.situacao === "enviada") && !m.dataEnvio).length;
    if (semEnvio) add("medicao-envio", "Medição", "Datas de envio das medições", "atencao", `${plural(semEnvio, "medição sem", "medições sem")} data de envio registrada.`);
  }

  // Documentação: pelo índice das pastas da obra; "não encontrado" pede conferência, não é falta certa
  if (emExecucao) {
    const idadeDiario = d.documentos.ultimoDiario ? diasEntre(d.documentos.ultimoDiario, d.hoje) : null;
    add("diario", "Documentação", "Diário de obra em dia", idadeDiario === null ? "atencao" : idadeDiario <= VALIDADE.diarioDias ? "ok" : "vencido", idadeDiario === null ? "Nenhum diário encontrado nas pastas da obra (14 Diário)." : `Último registro em ${br(d.documentos.ultimoDiario)} (há ${plural(idadeDiario, "dia", "dias")}).`);
    add("equipe", "Documentação", "Equipe e efetivo registrados", d.documentos.equipe ? "ok" : "atencao", d.documentos.equipe ? `${plural(d.documentos.equipe, "documento", "documentos")} em 13 Equipe/Efetivo.` : "Nada encontrado em 13 Equipe/Efetivo.");
    add("art", "Documentação", "ART de execução", d.documentos.art ? "ok" : "atencao", d.documentos.art ? `${plural(d.documentos.art, "documento", "documentos")} com ART no nome.` : "Nenhum documento com ART no nome nas pastas da obra.");
  }
  if (d.documentos.revisar) add("revisar", "Documentação", "Pasta 99 REVISAR vazia", "atencao", `${plural(d.documentos.revisar, "documento espera", "documentos esperam")} classificação.`);

  // Problemas
  add("problemas", "Problemas", "Problemas críticos com decisão", d.problemasCriticos ? "falta" : "ok", d.problemasCriticos ? `${plural(d.problemasCriticos, "problema", "problemas")} com GUT ≥ 64 em aberto.` : "Nenhum problema crítico em aberto.");

  return itens;
}

/** O que sobe para a Mesa: só falta e vencido, que pedem decisão ou atualização. */
export const pendencias = (itens: ItemProntidao[]) => itens.filter((i) => i.situacao === "falta" || i.situacao === "vencido");
