import { describe, expect, it } from "vitest";
import { FERRAMENTAS, responderMcp, retornoPermitido, VERSOES_MCP } from "./mcp";
import { retornoDoConsentimento } from "./rotas";

const semBanco = async () => {
  throw new Error("não deveria consultar");
};
const pedido = (method: string, params = {}) => ({ jsonrpc: "2.0", id: 1, method, params });

describe("protocolo", () => {
  it("responde initialize com a versão pedida", async () => {
    const r = (await responderMcp(pedido("initialize", { protocolVersion: "2025-06-18" }), semBanco)) as { result: { protocolVersion: string; capabilities: unknown } };
    expect(r.result.protocolVersion).toBe("2025-06-18");
    expect(r.result.capabilities).toEqual({ tools: {} });
  });

  it("versão desconhecida recebe a mais nova", async () => {
    const r = (await responderMcp(pedido("initialize", { protocolVersion: "1999-01-01" }), semBanco)) as { result: { protocolVersion: string } };
    expect(r.result.protocolVersion).toBe(VERSOES_MCP[0]);
  });

  it("notificação não tem resposta", async () => {
    expect(await responderMcp({ jsonrpc: "2.0", method: "notifications/initialized" }, semBanco)).toBeNull();
  });

  it("recusa lote e método desconhecido", async () => {
    expect(await responderMcp([pedido("ping")], semBanco)).toMatchObject({ error: { code: -32600 } });
    expect(await responderMcp(pedido("resources/list"), semBanco)).toMatchObject({ error: { code: -32601 } });
  });
});

describe("ferramentas", () => {
  it("todas são só de leitura e chamam funções do assistente", async () => {
    const r = (await responderMcp(pedido("tools/list"), semBanco)) as { result: { tools: { annotations: { readOnlyHint: boolean } }[] } };
    expect(r.result.tools).toHaveLength(FERRAMENTAS.length);
    expect(r.result.tools.every((t) => t.annotations.readOnlyHint)).toBe(true);
    expect(FERRAMENTAS.every((f) => f.funcao.startsWith("assistente_"))).toBe(true);
  });

  it("repassa os parâmetros validados", async () => {
    let chamada: unknown;
    const r = await responderMcp(pedido("tools/call", { name: "listar_tarefas", arguments: { obra: "PRF", somente_vencidas: true } }), async (funcao, parametros) => {
      chamada = { funcao, parametros };
      return { dados: [] };
    });
    expect(chamada).toEqual({ funcao: "assistente_tarefas", parametros: { p_obra: "PRF", p_somente_vencidas: true, p_limite: 50 } });
    expect(r).toMatchObject({ result: { isError: false } });
  });

  it("parâmetro desconhecido não chega ao banco", async () => {
    const r = await responderMcp(pedido("tools/call", { name: "listar_obras", arguments: { sql: "drop" } }), semBanco);
    expect(r).toMatchObject({ result: { isError: true } });
  });

  it("ferramenta inexistente é recusada", async () => {
    expect(await responderMcp(pedido("tools/call", { name: "gravar" }), semBanco)).toMatchObject({ error: { code: -32602 } });
  });

  it("erro do banco não vaza detalhe", async () => {
    const r = await responderMcp(pedido("tools/call", { name: "listar_obras" }), async () => {
      throw new Error("detalhe interno");
    });
    expect(JSON.stringify(r)).not.toContain("detalhe interno");
  });
});

describe("autorização", () => {
  it("só aceita o retorno oficial do Claude", () => {
    expect(retornoPermitido("https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(retornoPermitido("https://claude.ai/api/mcp/auth_callback?code=1")).toBe(true);
    expect(retornoPermitido("https://claude.ai.evil.com/api/mcp/auth_callback")).toBe(false);
    expect(retornoPermitido("http://localhost:3000/callback")).toBe(false);
    expect(retornoPermitido("lixo")).toBe(false);
    expect(retornoPermitido(null)).toBe(false);
  });

  it("volta ao consentimento só por caminho seguro", () => {
    expect(retornoDoConsentimento("/oauth/consent?authorization_id=abc-123")).toBe("/oauth/consent?authorization_id=abc-123");
    expect(retornoDoConsentimento("https://site.com")).toBeNull();
    expect(retornoDoConsentimento("/oauth/consent?authorization_id=a&x=1")).toBeNull();
    expect(retornoDoConsentimento(undefined)).toBeNull();
  });
});
