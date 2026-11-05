/** Regras da tela Integrações e do alerta no Painel. Sem acesso ao banco, para poder testar. */
export const PAUSA_SEM_PRAZO = "2100-01-01T00:00:00Z";

type Conector = {
  nome_exibicao: string;
  ativo: boolean;
  estado_conexao: string;
  ultima_sync_em: string | null;
  intervalo_minutos: number;
  pausado_ate: string | null;
};

export const estaPausado = (c: { pausado_ate: string | null }, agora: Date) => !!c.pausado_ate && Date.parse(c.pausado_ate) > agora.getTime();

/** Tolerância: 3 horas para o que roda de hora em hora, e 20% a mais para a rotina semanal. */
const limiteEmMinutos = (intervalo: number) => Math.max(intervalo * 1.2, 180);

/** Conectores que pedem atenção. Pausado é escolha do proprietário, então não vira alerta. */
export function alertasConectores(conectores: Conector[], agora: Date): string[] {
  const alertas: string[] = [];
  for (const c of conectores) {
    if (!c.ativo || estaPausado(c, agora)) continue;
    if (c.estado_conexao === "erro_autenticacao") alertas.push(`${c.nome_exibicao}: autorização expirada ou sem permissão.`);
    else if (c.estado_conexao === "erro") alertas.push(`${c.nome_exibicao}: a última leitura teve erro.`);
    else if (c.ultima_sync_em && (agora.getTime() - Date.parse(c.ultima_sync_em)) / 60000 > limiteEmMinutos(c.intervalo_minutos)) alertas.push(`${c.nome_exibicao}: sem leitura há mais tempo que o esperado.`);
  }
  return alertas;
}
