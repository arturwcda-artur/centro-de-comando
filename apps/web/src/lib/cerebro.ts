/**
 * Cérebro do planejamento (RN-49n). Calcula o efeito de uma decisão no cronograma vigente, como o
 * MS Project faria: a atividade muda e as seguintes andam pelas ligações (TI, II, TT, IT e defasagem),
 * respeitando a folga que já existe. Não grava nada e nunca altera o arquivo do Project: devolve o
 * efeito, os conflitos e a rota para o proprietário decidir. Sem acesso ao banco, para poder testar.
 *
 * Datas em dias úteis de segunda a sexta (o Project recalcula com o calendário da obra).
 */

export type AtividadePlano = {
  id: string;
  edt: string | null;
  nome: string;
  resumo: boolean;
  marco: boolean;
  critica: boolean;
  inicio_previsto: string | null;
  fim_previsto: string | null;
  duracao_dias: number | null;
  percentual: number;
};
export type LigacaoPlano = { atividade_id: string; predecessora_id: string; tipo: string; defasagem_dias: number };
export type TipoMudanca = "atrasar" | "adiantar" | "duracao";
export type Mudanca = { atividadeId: string; tipo: TipoMudanca; dias: number };
export type Deslocamento = { id: string; rotulo: string; inicio: string | null; fim: string | null; inicioNovo: string | null; fimNovo: string | null; dias: number; critica: boolean; marco: boolean };
export type Impacto = {
  alvo: Deslocamento;
  deslocadas: Deslocamento[];
  terminoAntes: string | null;
  terminoDepois: string | null;
  variacaoUteis: number;
  conflitos: string[];
  avisos: string[];
  rota: string[];
};

export const TIPOS_MUDANCA: { valor: TipoMudanca; rotulo: string }[] = [
  { valor: "atrasar", rotulo: "Atrasa o início (dias úteis)" },
  { valor: "adiantar", rotulo: "Adianta o início (dias úteis)" },
  { valor: "duracao", rotulo: "Nova duração (dias úteis)" },
];

const MEIO_DIA = (iso: string) => new Date(`${iso}T12:00:00Z`);
const ehUtil = (iso: string) => {
  const d = MEIO_DIA(iso).getUTCDay();
  return d !== 0 && d !== 6;
};
const proximo = (iso: string, passo: number) => {
  const d = MEIO_DIA(iso);
  d.setUTCDate(d.getUTCDate() + passo);
  return d.toISOString().slice(0, 10);
};

/** Dias úteis depois de `a` até `b` (inclusive); negativo quando `b` vem antes. */
export function uteisEntre(a: string, b: string): number {
  if (a === b) return 0;
  const passo = b > a ? 1 : -1;
  let n = 0;
  for (let d = a; d !== b; ) {
    d = proximo(d, passo);
    if (passo > 0 ? ehUtil(d) : ehUtil(proximo(d, 1))) n += passo;
  }
  return n;
}

/** Anda `n` dias úteis a partir da data (n pode ser negativo). Data em fim de semana conta a partir dela. */
export function somarUteis(iso: string, n: number): string {
  let d = iso;
  const passo = n >= 0 ? 1 : -1;
  for (let falta = Math.abs(n); falta > 0; ) {
    d = proximo(d, passo);
    if (ehUtil(d)) falta -= 1;
  }
  return d;
}

const dataBR = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
const rotulo = (a: Pick<AtividadePlano, "edt" | "nome">) => (a.edt ? `${a.edt} ${a.nome}` : a.nome);
const comSinal = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Folga da ligação em dias úteis: quanto a predecessora pode andar sem empurrar a sucessora. */
function folga(p: AtividadePlano, s: AtividadePlano, l: LigacaoPlano): number | null {
  const lag = Math.round(Number(l.defasagem_dias) || 0);
  const de = l.tipo === "II" || l.tipo === "IT" ? p.inicio_previsto : p.fim_previsto;
  const ate = l.tipo === "TT" || l.tipo === "IT" ? s.fim_previsto : s.inicio_previsto;
  if (!de || !ate) return null;
  const tiDiaSeguinte = l.tipo === "TI" ? 1 : 0; // no TI a sucessora começa no dia útil seguinte
  return Math.max(0, uteisEntre(de, ate) - tiDiaSeguinte - lag);
}

/** Terminam por último as atividades comuns (sem resumo e sem marco). */
function termino(atividades: AtividadePlano[], fim: (a: AtividadePlano) => string | null): string | null {
  return (
    atividades
      .filter((a) => !a.resumo && !a.marco)
      .map(fim)
      .filter((d): d is string => !!d)
      .sort()
      .at(-1) ?? null
  );
}

export function calcularImpacto(
  atividades: AtividadePlano[],
  ligacoes: LigacaoPlano[],
  mudanca: Mudanca,
  contexto: { prazoContratual: string | null; hoje: string; cronograma: string },
): Impacto | null {
  const porId = new Map(atividades.map((a) => [a.id, a]));
  const alvo = porId.get(mudanca.atividadeId);
  if (!alvo) return null;
  const dias = Math.max(0, Math.round(mudanca.dias));
  const duracao = Math.round(Number(alvo.duracao_dias) || 0);

  // Deslocamento de início e de fim, em dias úteis
  const ini = new Map<string, number>();
  const fim = new Map<string, number>();
  if (mudanca.tipo === "duracao") {
    ini.set(alvo.id, 0);
    fim.set(alvo.id, dias - duracao);
  } else {
    const d = mudanca.tipo === "atrasar" ? dias : -dias;
    ini.set(alvo.id, d);
    fim.set(alvo.id, d);
  }

  const sucessoras = new Map<string, LigacaoPlano[]>();
  const predecessoras = new Map<string, LigacaoPlano[]>();
  for (const l of ligacoes) {
    if (!porId.has(l.atividade_id) || !porId.has(l.predecessora_id)) continue;
    sucessoras.set(l.predecessora_id, [...(sucessoras.get(l.predecessora_id) ?? []), l]);
    predecessoras.set(l.atividade_id, [...(predecessoras.get(l.atividade_id) ?? []), l]);
  }

  /** Quanto a sucessora anda: a predecessora que mais empurra manda; só adianta se for puxada por quem adiantou. */
  const deslocar = (s: AtividadePlano): number => {
    let maior = -Infinity;
    let puxada = false;
    let mexeu = false;
    for (const l of predecessoras.get(s.id) ?? []) {
      const p = porId.get(l.predecessora_id) as AtividadePlano;
      const andou = (l.tipo === "II" || l.tipo === "IT" ? ini : fim).get(p.id) ?? 0;
      const f = folga(p, s, l);
      if (f === null) continue;
      if (andou !== 0) mexeu = true;
      if (andou < 0 && f === 0) puxada = true;
      maior = Math.max(maior, andou - f);
    }
    if (!mexeu || maior === -Infinity) return 0;
    if (maior > 0) return maior;
    return puxada ? maior : 0;
  };

  // Propaga pelas ligações até estabilizar (o cronograma não tem ciclos; o limite evita laço infinito)
  const fila = [...(sucessoras.get(alvo.id) ?? [])].map((l) => l.atividade_id);
  for (let voltas = 0; fila.length && voltas < atividades.length * 20; voltas += 1) {
    const id = fila.shift() as string;
    if (id === alvo.id) continue;
    const novo = deslocar(porId.get(id) as AtividadePlano);
    if (novo === (ini.get(id) ?? 0)) continue;
    ini.set(id, novo);
    fim.set(id, novo);
    for (const l of sucessoras.get(id) ?? []) fila.push(l.atividade_id);
  }

  const mover = (iso: string | null, n: number) => (iso ? somarUteis(iso, n) : null);
  const descrever = (a: AtividadePlano): Deslocamento => ({
    id: a.id,
    rotulo: rotulo(a),
    inicio: a.inicio_previsto,
    fim: a.fim_previsto,
    inicioNovo: mover(a.inicio_previsto, ini.get(a.id) ?? 0),
    fimNovo: mover(a.fim_previsto, fim.get(a.id) ?? 0),
    dias: fim.get(a.id) ?? 0,
    critica: a.critica,
    marco: a.marco,
  });
  const deslocadas = atividades
    .filter((a) => a.id !== alvo.id && !a.resumo && (fim.get(a.id) ?? 0) !== 0)
    .map(descrever)
    .sort((a, b) => Math.abs(b.dias) - Math.abs(a.dias) || (a.inicio ?? "").localeCompare(b.inicio ?? ""));
  const descAlvo = descrever(alvo);
  const novoFim = new Map([descAlvo, ...deslocadas].map((d) => [d.id, d.fimNovo]));
  const terminoAntes = termino(atividades, (a) => a.fim_previsto);
  const terminoDepois = termino(atividades, (a) => (novoFim.has(a.id) ? (novoFim.get(a.id) ?? null) : a.fim_previsto));
  const variacaoUteis = terminoAntes && terminoDepois ? uteisEntre(terminoAntes, terminoDepois) : 0;

  const conflitos: string[] = [];
  const avisos: string[] = [];
  const { prazoContratual: prazo } = contexto;
  if (prazo && terminoDepois && terminoDepois > prazo) {
    if (terminoAntes && terminoAntes > prazo) avisos.push(`O cronograma já terminava depois do prazo contratual (${dataBR(prazo)}) antes desta decisão.`);
    else conflitos.push(`O término (${dataBR(terminoDepois)}) passa do prazo contratual de ${dataBR(prazo)}.`);
  }
  const criticas = [descAlvo, ...deslocadas].filter((d) => d.critica && d.dias !== 0);
  if (criticas.length) conflitos.push(`Mexe no caminho crítico: ${criticas.length} atividade(s) crítica(s) deslocada(s), entre elas ${criticas[0].rotulo}.`);
  for (const m of deslocadas.filter((d) => d.marco)) conflitos.push(`O marco ${m.rotulo} passa de ${dataBR(m.fim)} para ${dataBR(m.fimNovo)}.`);
  const mudaMes = [descAlvo, ...deslocadas].filter((d) => d.fim && d.fimNovo && d.fim.slice(0, 7) !== d.fimNovo.slice(0, 7)).length;
  if (mudaMes) conflitos.push(`${mudaMes} atividade(s) mudam o mês de término: reveja a previsão de medição desses meses.`);
  const concluidas = [descAlvo, ...deslocadas].filter((d) => d.dias !== 0 && (porId.get(d.id)?.percentual ?? 0) >= 100).length;
  if (concluidas) avisos.push(`${concluidas} atividade(s) já concluída(s) no cronograma seriam deslocadas: confira se a ligação ainda vale.`);
  if (descAlvo.inicioNovo && mudanca.tipo !== "duracao" && descAlvo.inicioNovo < contexto.hoje) avisos.push(`O novo início (${dataBR(descAlvo.inicioNovo)}) fica no passado.`);
  if (!ligacoes.length) avisos.push("Este cronograma não tem ligações entre atividades: só a atividade escolhida muda. Ligue as atividades no Project para o cálculo valer para a obra toda.");
  else if (!(sucessoras.get(alvo.id) ?? []).length) avisos.push("A atividade não tem sucessoras no cronograma: só ela muda. Confira no Project se falta alguma ligação.");

  const rota = [`Abrir o cronograma vigente (${contexto.cronograma}).`];
  if (mudanca.tipo === "duracao") rota.push(`Na atividade ${rotulo(alvo)}: mudar a duração de ${duracao} para ${dias} dias úteis.`);
  else
    rota.push(
      `Na atividade ${rotulo(alvo)}: ${mudanca.tipo === "atrasar" ? "atrasar" : "adiantar"} o início de ${dataBR(alvo.inicio_previsto)} para ${dataBR(descAlvo.inicioNovo)} (${dias} dias úteis), mantendo a duração. De preferência pela defasagem da ligação com a predecessora, sem fixar data.`,
    );
  if (deslocadas.length)
    rota.push(
      `Conferir que ${deslocadas.length} atividade(s) seguinte(s) se deslocaram. As principais: ${deslocadas
        .slice(0, 5)
        .map((d) => `${d.rotulo} (${comSinal(d.dias)} d)`)
        .join("; ")}.`,
    );
  rota.push(
    variacaoUteis === 0
      ? `O término da obra não muda (${dataBR(terminoAntes)}): a folga absorve a mudança.`
      : `O término deve passar de ${dataBR(terminoAntes)} para ${dataBR(terminoDepois)} (${comSinal(variacaoUteis)} dias úteis).`,
  );
  if (conflitos.length) rota.push(`Antes de salvar, resolver os conflitos: ${conflitos.join(" ")}`);
  rota.push("Salvar como nova revisão (REV seguinte) na pasta VALIDOS. O sistema lê na próxima sincronização.");

  return { alvo: descAlvo, deslocadas, terminoAntes, terminoDepois, variacaoUteis, conflitos, avisos, rota };
}
