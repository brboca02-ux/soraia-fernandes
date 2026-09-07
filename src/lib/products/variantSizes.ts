// Pure helpers para determinar tamanhos sugeridos e gerar variações.
// Extraídos para permitir testes automatizados (ver variantSizes.test.ts).

export type ProductCategoryId = "feminino" | "masculino";

const BOTTOM_RE = /(cal[çc]a|short|bermuda|saia|legging|pantalona|jogger)/i;

export function isBottomPiece(pieceType: string | undefined | null): boolean {
  if (!pieceType) return false;
  return BOTTOM_RE.test(pieceType);
}

/**
 * Retorna o array de tamanhos padrão para uma peça, quando a IA não devolveu
 * `sizes_suggested`. Calças/shorts/bermudas/saias usam numeração (36–46) e,
 * no plus size, numeração ampliada (46–54).
 */
export function computeFallbackSizes(input: {
  category: ProductCategoryId | string;
  pieceType?: string | null;
}): string[] {
  const { category } = input;
  const isBottom = isBottomPiece(input.pieceType ?? "");
  const isPlus = category === "plus-size";
  const isKids = category === "infantil";
  const isShoes = category === "calcados";
  const isMasc = category === "masculino";

  if (isShoes) {
    return isMasc
      ? ["38", "39", "40", "41", "42", "43", "44"]
      : ["34", "35", "36", "37", "38", "39"];
  }
  if (isKids) return ["2", "4", "6", "8", "10"];
  if (isBottom && isPlus) return ["46", "48", "50", "52", "54"];
  if (isBottom && isMasc) return ["38", "40", "42", "44", "46", "48"];
  if (isBottom) return ["36", "38", "40", "42", "44", "46"];
  if (isPlus) return ["G", "GG", "XG", "EXG"];
  return ["PP", "P", "M", "G", "GG"];
}

export interface DraftVariant {
  id: string;
  product_id: string;
  size: string;
  color: string;
  stock: number;
}

/**
 * Distribui `stockTotal` igualmente entre os `sizes`. O resto (quando não
 * divide exato) fica no primeiro tamanho. Se `sizes` estiver vazio, retorna
 * uma variação única com todo o estoque.
 */
export function buildSizeVariants(
  sizes: readonly string[],
  stockTotal: number,
  color: string,
): DraftVariant[] {
  const c = color || "Único";
  const total = Math.max(0, Math.floor(stockTotal));
  if (!sizes.length) {
    return [{ id: "tmp-0", product_id: "temp", size: "Único", color: c, stock: total }];
  }
  const each = Math.floor(total / sizes.length);
  const rem = total - each * sizes.length;
  return sizes.map((s, i) => ({
    id: `tmp-${i}`,
    product_id: "temp",
    size: s,
    color: c,
    stock: each + (i === 0 ? rem : 0),
  }));
}
