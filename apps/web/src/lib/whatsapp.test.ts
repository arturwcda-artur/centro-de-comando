import { describe, expect, it } from "vitest";
import { LIMITE_TAREFAS, linkWhatsApp, mensagemDeTarefas, numeroWhatsApp } from "./whatsapp";

describe("número do WhatsApp", () => {
  it("acrescenta 55 ao celular com DDD", () => {
    expect(numeroWhatsApp("(61) 99876-5432")).toBe("5561998765432");
  });
  it("aceita número que já tem 55 e ignora zero inicial", () => {
    expect(numeroWhatsApp("+55 61 99876-5432")).toBe("5561998765432");
    expect(numeroWhatsApp("061 3333-4444")).toBe("556133334444");
  });
  it("devolve nulo quando não dá para usar", () => {
    expect(numeroWhatsApp(null)).toBeNull();
    expect(numeroWhatsApp("1234")).toBeNull();
  });
});

describe("mensagem de tarefas", () => {
  const tarefas = [
    { titulo: "Enviar medição", prazo: "2026-11-10", vencida: true, obra: "PRF" },
    { titulo: "Pedir orçamento", prazo: null },
  ];
  it("cumprimenta pelo primeiro nome e numera as tarefas", () => {
    const m = mensagemDeTarefas("Celso Souza", tarefas, "2026-11-13");
    expect(m).toContain("Olá, Celso! Segue a sua lista de tarefas em 13/11/2026 (2 tarefas):");
    expect(m).toContain("1. Enviar medição — PRF — prazo 10/11 (ATRASADA)");
    expect(m).toContain("2. Pedir orçamento\n");
  });
  it("corta a lista longa e diz quantas ficaram de fora", () => {
    const muitas = Array.from({ length: LIMITE_TAREFAS + 3 }, (_, i) => ({ titulo: `T${i}`, prazo: null }));
    const m = mensagemDeTarefas("Ana", muitas, "2026-11-13");
    expect(m).toContain(`${LIMITE_TAREFAS}. T${LIMITE_TAREFAS - 1}`);
    expect(m).not.toContain(`T${LIMITE_TAREFAS}\n`);
    expect(m).toContain("… e mais 3.");
  });
});

describe("link do WhatsApp", () => {
  it("abre direto na conversa quando há telefone", () => {
    expect(linkWhatsApp("Olá & até", "61998765432")).toBe("https://wa.me/5561998765432?text=Ol%C3%A1%20%26%20at%C3%A9");
  });
  it("sem telefone, deixa escolher o contato", () => {
    expect(linkWhatsApp("oi")).toBe("https://wa.me/?text=oi");
  });
});
