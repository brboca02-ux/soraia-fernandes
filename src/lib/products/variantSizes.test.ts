import { describe, it, expect } from "vitest";
import {
  computeFallbackSizes,
  buildSizeVariants,
  isBottomPiece,
} from "./variantSizes";

describe("isBottomPiece", () => {
  it("reconhece calças, shorts, bermudas, saias, leggings", () => {
    expect(isBottomPiece("Calça jeans")).toBe(true);
    expect(isBottomPiece("Calca cargo")).toBe(true); // sem cedilha
    expect(isBottomPiece("Short alfaiataria")).toBe(true);
    expect(isBottomPiece("Bermuda de moletom")).toBe(true);
    expect(isBottomPiece("Saia midi")).toBe(true);
    expect(isBottomPiece("Legging tie dye")).toBe(true);
    expect(isBottomPiece("Pantalona lótus")).toBe(true);
  });

  it("rejeita peças que não são de parte de baixo", () => {
    expect(isBottomPiece("Vestido midi")).toBe(false);
    expect(isBottomPiece("Blusa cropped")).toBe(false);
    expect(isBottomPiece("Camiseta")).toBe(false);
    expect(isBottomPiece("")).toBe(false);
    expect(isBottomPiece(undefined)).toBe(false);
  });
});

describe("computeFallbackSizes — calças e afins", () => {
  it("calça feminina usa numeração 36–46", () => {
    const sizes = computeFallbackSizes({ category: "feminino", pieceType: "Calça jeans mom" });
    expect(sizes).toEqual(["36", "38", "40", "42", "44", "46"]);
    // Garantia explícita do que o cliente pediu:
    expect(sizes).toContain("38");
    expect(sizes).toContain("40");
  });

  it("short feminino usa a mesma numeração 36–46", () => {
    expect(computeFallbackSizes({ category: "feminino", pieceType: "Short alfaiataria" }))
      .toEqual(["36", "38", "40", "42", "44", "46"]);
  });

  it("saia feminina também usa 36–46", () => {
    expect(computeFallbackSizes({ category: "vestidos", pieceType: "Saia midi" }))
      .toEqual(["36", "38", "40", "42", "44", "46"]);
  });

  it("calça plus size usa numeração ampliada 46–54", () => {
    const sizes = computeFallbackSizes({ category: "plus-size", pieceType: "Calça pantalona" });
    expect(sizes).toEqual(["46", "48", "50", "52", "54"]);
    expect(sizes).toContain("48");
    expect(sizes).toContain("50");
  });

  it("calça masculina usa 38–48", () => {
    expect(computeFallbackSizes({ category: "masculino", pieceType: "Calça jeans" }))
      .toEqual(["38", "40", "42", "44", "46", "48"]);
  });
});

describe("computeFallbackSizes — demais peças (regressão)", () => {
  it("blusa feminina continua PP–GG", () => {
    expect(computeFallbackSizes({ category: "feminino", pieceType: "Blusa cropped" }))
      .toEqual(["PP", "P", "M", "G", "GG"]);
  });

  it("vestido plus size (não bottom) continua G–EXG", () => {
    expect(computeFallbackSizes({ category: "plus-size", pieceType: "Vestido midi" }))
      .toEqual(["G", "GG", "XG", "EXG"]);
  });

  it("infantil ignora numeração adulta", () => {
    expect(computeFallbackSizes({ category: "infantil", pieceType: "Calça infantil" }))
      .toEqual(["2", "4", "6", "8", "10"]);
  });

  it("calçado feminino usa 34–39", () => {
    expect(computeFallbackSizes({ category: "calcados", pieceType: "Sandália" }))
      .toEqual(["34", "35", "36", "37", "38", "39"]);
  });
});

describe("buildSizeVariants — geração de variações para calças", () => {
  it("gera uma variação por tamanho numérico feminino, com a cor detectada", () => {
    const sizes = computeFallbackSizes({ category: "feminino", pieceType: "Calça jeans" });
    const variants = buildSizeVariants(sizes, 24, "Azul");

    expect(variants).toHaveLength(6);
    expect(variants.map((v) => v.size)).toEqual(["36", "38", "40", "42", "44", "46"]);
    expect(variants.every((v) => v.color === "Azul")).toBe(true);

    // Estoque distribuído igualmente (24 / 6 = 4 em cada)
    expect(variants.every((v) => v.stock === 4)).toBe(true);
    expect(variants.reduce((sum, v) => sum + v.stock, 0)).toBe(24);
  });

  it("põe o resto da divisão no primeiro tamanho quando não divide exato", () => {
    const sizes = ["36", "38", "40", "42", "44", "46"];
    const variants = buildSizeVariants(sizes, 25, "Preto");
    expect(variants[0].size).toBe("36");
    expect(variants[0].stock).toBe(5); // 4 + 1 de resto
    expect(variants.slice(1).every((v) => v.stock === 4)).toBe(true);
    expect(variants.reduce((s, v) => s + v.stock, 0)).toBe(25);
  });

  it("gera variações 46–54 para calça plus size", () => {
    const sizes = computeFallbackSizes({ category: "plus-size", pieceType: "Calça pantalona" });
    const variants = buildSizeVariants(sizes, 10, "Marrom");

    expect(variants.map((v) => v.size)).toEqual(["46", "48", "50", "52", "54"]);
    expect(variants).toHaveLength(5);
    expect(variants.every((v) => v.color === "Marrom")).toBe(true);
    expect(variants.reduce((sum, v) => sum + v.stock, 0)).toBe(10);
    // 10 / 5 = 2 exato
    expect(variants.every((v) => v.stock === 2)).toBe(true);
  });

  it("aceita tamanhos vindos da IA sem sobrescrever", () => {
    const aiSuggested = ["38", "40", "42", "44"]; // IA retornou só esses
    const variants = buildSizeVariants(aiSuggested, 8, "Verde");
    expect(variants.map((v) => v.size)).toEqual(["38", "40", "42", "44"]);
    expect(variants.every((v) => v.stock === 2)).toBe(true);
  });

  it("com estoque 0, todas as variações ficam com 0", () => {
    const variants = buildSizeVariants(["36", "38", "40"], 0, "Bege");
    expect(variants.every((v) => v.stock === 0)).toBe(true);
  });

  it("cor vazia vira 'Único'", () => {
    const variants = buildSizeVariants(["38"], 3, "");
    expect(variants[0].color).toBe("Único");
  });
});

describe("Fluxo end-to-end (fallback + build) para calças", () => {
  it("calça feminina sem sugestão da IA → 38 e 40 estão nas variações", () => {
    const sizes = computeFallbackSizes({ category: "feminino", pieceType: "Calça cargo" });
    const variants = buildSizeVariants(sizes, 30, "Grafite");
    const geradas = variants.map((v) => v.size);
    expect(geradas).toContain("38");
    expect(geradas).toContain("40");
    expect(geradas).toContain("42");
  });

  it("calça plus size sem sugestão da IA → 48 e 50 estão nas variações", () => {
    const sizes = computeFallbackSizes({ category: "plus-size", pieceType: "Calça alfaiataria" });
    const variants = buildSizeVariants(sizes, 20, "Preto");
    const geradas = variants.map((v) => v.size);
    expect(geradas).toContain("48");
    expect(geradas).toContain("50");
    expect(geradas).not.toContain("PP");
    expect(geradas).not.toContain("M");
  });
});
