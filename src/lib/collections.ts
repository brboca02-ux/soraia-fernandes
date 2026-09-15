// Coleções dinâmicas da home/menu.
// Diferente das categorias (feminino/masculino), estas são calculadas a partir
// dos próprios produtos — assim um item em promoção continua aparecendo também
// na sua categoria de gênero.

export type CollectionKind = "promo" | "recent" | null;

const PROMO_SLUGS = new Set([
  "promocoes",
  "promocao",
  "50-off",
  "ultimas",
  "recebidos-promo",
  "mais-vendidos",
]);

const RECENT_SLUGS = new Set([
  "recebidos-da-semana",
  "recebidos",
  "novidades",
  "lancamentos",
]);

export function resolveCollection(slug?: string): CollectionKind {
  if (!slug) return null;
  const s = slug.toLowerCase();
  if (PROMO_SLUGS.has(s)) return "promo";
  if (RECENT_SLUGS.has(s)) return "recent";
  return null;
}

export const COLLECTION_CHIPS = [
  { id: "recebidos-da-semana", name: "Recebidos da Semana" },
  { id: "promocoes", name: "Promoções" },
] as const;
