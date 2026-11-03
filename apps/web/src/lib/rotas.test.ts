import { describe, expect, it } from "vitest";
import { decidirRedirecionamento as decidir, type EstadoSessao } from "./rotas";

const anonimo: EstadoSessao = { logado: false, aalAtual: null, aalProximo: null };
const semFator: EstadoSessao = { logado: true, aalAtual: "aal1", aalProximo: "aal1" };
const faltaCodigo: EstadoSessao = { logado: true, aalAtual: "aal1", aalProximo: "aal2" };
const completo: EstadoSessao = { logado: true, aalAtual: "aal2", aalProximo: "aal2" };

describe("acesso às rotas", () => {
  it("anônimo só acessa o login", () => {
    expect(decidir("/login", anonimo)).toBeNull();
    for (const r of ["/", "/obras", "/busca", "/mfa/cadastrar", "/mfa/verificar"]) expect(decidir(r, anonimo)).toBe("/login");
  });

  it("logado sem autenticador é obrigado a cadastrar um", () => {
    expect(decidir("/", semFator)).toBe("/mfa/cadastrar");
    expect(decidir("/login", semFator)).toBe("/mfa/cadastrar");
    expect(decidir("/mfa/verificar", semFator)).toBe("/mfa/cadastrar");
    expect(decidir("/mfa/cadastrar", semFator)).toBeNull();
  });

  it("logado com autenticador, mas sem o código, vai para a verificação", () => {
    expect(decidir("/obras", faltaCodigo)).toBe("/mfa/verificar");
    expect(decidir("/mfa/cadastrar", faltaCodigo)).toBe("/mfa/verificar"); // não permite trocar o fator sem provar o atual
    expect(decidir("/mfa/verificar", faltaCodigo)).toBeNull();
  });

  it("sessão completa (senha + código) acessa tudo e sai das telas de login", () => {
    expect(decidir("/", completo)).toBeNull();
    expect(decidir("/contratos", completo)).toBeNull();
    expect(decidir("/login", completo)).toBe("/");
    expect(decidir("/mfa/verificar", completo)).toBe("/");
  });

  it("sair funciona em qualquer estado", () => {
    for (const s of [anonimo, semFator, faltaCodigo, completo]) expect(decidir("/sair", s)).toBeNull();
  });
});
