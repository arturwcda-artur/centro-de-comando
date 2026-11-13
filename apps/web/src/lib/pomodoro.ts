/** Horário livre para os lembretes, em blocos de pomodoro (RN-49i). Sem acesso a rede, para poder testar. */
import { somarDias } from "@/lib/formato";

/** Decisão do proprietário em 13/11/2026: segunda a sexta, 08:00 às 16:00, sem o almoço das 12:00 às 13:00. */
export const JANELAS: [number, number][] = [
  [8 * 60, 12 * 60],
  [13 * 60, 16 * 60],
];
export const DURACOES = [30, 40, 60, 90];
export const DURACAO_PADRAO = 30;
const PASSO = 5;

export const paraHora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const paraMinutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

const diaDaSemana = (data: string) => new Date(`${data}T12:00:00Z`).getUTCDay();
export const diaUtil = (data: string) => diaDaSemana(data) !== 0 && diaDaSemana(data) !== 6;

/** Fim de semana volta para a sexta; se isso cair antes de hoje, vai para o próximo dia útil. */
export function ajustarDiaUtil(data: string, hoje: string): string {
  let d = data;
  while (!diaUtil(d)) d = somarDias(d, -1);
  if (d < hoje) {
    d = hoje;
    while (!diaUtil(d)) d = somarDias(d, 1);
  }
  return d;
}

/** Data civil e minuto do dia em São Paulo de um instante. */
export function emSaoPaulo(iso: string): { data: string; minuto: number } {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return { data: `${partes.year}-${partes.month}-${partes.day}`, minuto: Number(partes.hour) * 60 + Number(partes.minute) };
}

type Evento = { inicio: string | null; fim: string | null; dia_inteiro: boolean };

/** Intervalos ocupados no dia, em minutos. Evento de dia inteiro, como os lembretes antigos, não ocupa horário. */
export function ocupadosNoDia(eventos: Evento[], data: string): [number, number][] {
  const ocupados: [number, number][] = [];
  for (const e of eventos) {
    if (e.dia_inteiro || !e.inicio || !e.fim) continue;
    const ini = emSaoPaulo(e.inicio);
    const fim = emSaoPaulo(e.fim);
    if (fim.data < data || ini.data > data) continue;
    ocupados.push([ini.data < data ? 0 : ini.minuto, fim.data > data ? 24 * 60 : fim.minuto]);
  }
  return ocupados;
}

/**
 * Até `quantos` horários livres no dia, sem sobrepor nenhum compromisso e dentro das janelas.
 * Cada opção começa depois do fim da anterior. Com `agora`, não sugere horário que já passou.
 */
export function horariosLivres(ocupados: [number, number][], duracao: number, agora: number | null = null, quantos = 3): [number, number][] {
  const opcoes: [number, number][] = [];
  for (const [abre, fecha] of JANELAS) {
    let inicio = Math.max(abre, agora === null ? abre : Math.ceil(agora / PASSO) * PASSO);
    while (inicio + duracao <= fecha && opcoes.length < quantos) {
      const conflito = ocupados.find(([a, b]) => inicio < b && inicio + duracao > a);
      if (conflito) {
        inicio = Math.ceil(conflito[1] / PASSO) * PASSO;
        continue;
      }
      opcoes.push([inicio, inicio + duracao]);
      inicio += duracao;
    }
  }
  return opcoes;
}
