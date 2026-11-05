import { describe, expect, it } from "vitest";
import { avisosDocumentos, espacoUsado, partesDoTrecho } from "./documentos";

describe("avisosDocumentos", () => {
  const base = { semLink: 0, digitalizados: 0, erro: null, diasDesdeLeitura: 1 };

  it("sem problemas, sem avisos", () => {
    expect(avisosDocumentos(base)).toEqual([]);
    expect(avisosDocumentos({ ...base, diasDesdeLeitura: null })).toEqual([]);
  });

  it("avisa erro, falta de link, digitalizados e leitura antiga", () => {
    expect(avisosDocumentos({ semLink: 3, digitalizados: 15, erro: "Pasta não encontrada", diasDesdeLeitura: 8 })).toHaveLength(4);
  });
});

describe("partesDoTrecho", () => {
  it("separa os termos encontrados", () => {
    expect(partesDoTrecho("da «laje» do bloco")).toEqual([
      { texto: "da ", destaque: false },
      { texto: "laje", destaque: true },
      { texto: " do bloco", destaque: false },
    ]);
  });

  it("texto do arquivo continua sendo texto", () => {
    expect(partesDoTrecho("<script>x</script>")).toEqual([{ texto: "<script>x</script>", destaque: false }]);
  });
});

describe("espacoUsado", () => {
  it("mostra MB e percentual do plano gratuito", () => {
    expect(espacoUsado(50 * 1024 * 1024)).toBe("50 MB de 500 MB (10%)");
    expect(espacoUsado(null)).toBeNull();
  });
});
