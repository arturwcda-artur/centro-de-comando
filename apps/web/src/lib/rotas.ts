/**
 * Regras de acesso às rotas (aplicadas no proxy e reaplicadas no layout autenticado).
 * O acesso ao sistema exige senha + segundo fator (aal2). O banco também exige aal2 (migration 0012).
 */
export type NivelAal = "aal1" | "aal2" | null;

export type EstadoSessao = {
  logado: boolean;
  aalAtual: NivelAal;
  /** "aal2" quando o usuário já tem um fator TOTP cadastrado; "aal1" quando ainda não tem. */
  aalProximo: NivelAal;
};

export const ROTA_LOGIN = "/login";
export const ROTA_MFA_CADASTRAR = "/mfa/cadastrar";
export const ROTA_MFA_VERIFICAR = "/mfa/verificar";
export const ROTA_INICIAL = "/";
export const ROTA_SAIR = "/sair";

function rotaDoSegundoFator(s: EstadoSessao) {
  return s.aalProximo === "aal2" ? ROTA_MFA_VERIFICAR : ROTA_MFA_CADASTRAR;
}

/** Retorna para onde redirecionar, ou null se o acesso ao caminho é permitido. */
export function decidirRedirecionamento(caminho: string, s: EstadoSessao): string | null {
  const completo = s.logado && s.aalAtual === "aal2";

  if (caminho === ROTA_SAIR) return null; // sair precisa funcionar em qualquer estado

  if (caminho === ROTA_LOGIN) {
    if (!s.logado) return null;
    return completo ? ROTA_INICIAL : rotaDoSegundoFator(s);
  }

  if (caminho === ROTA_MFA_CADASTRAR || caminho === ROTA_MFA_VERIFICAR) {
    if (!s.logado) return ROTA_LOGIN;
    if (completo) return ROTA_INICIAL;
    const devida = rotaDoSegundoFator(s);
    return caminho === devida ? null : devida;
  }

  if (!s.logado) return ROTA_LOGIN;
  if (!completo) return rotaDoSegundoFator(s);
  return null;
}
