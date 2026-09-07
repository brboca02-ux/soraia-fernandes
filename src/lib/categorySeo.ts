// SEO textual Ãºnico por categoria â€” tÃ­tulos, descriÃ§Ãµes e copy de intro
// usados na pÃ¡gina /colecao?c=<id> para reforÃ§ar ranqueamento long-tail.
import { resolveCollection } from "@/lib/collections";


export interface CategorySeo {
  id: string;
  name: string;
  title: string;         // <title>
  description: string;   // meta description (â‰¤160)
  h1: string;            // H1 na pÃ¡gina
  eyebrow: string;       // "olho" acima do H1
  intro: string;         // parÃ¡grafo de contexto (rico em keywords, natural)
  keywords: string[];    // palavras-chave alvo (para <meta name="keywords">)
}

export const CATEGORY_SEO: Record<string, CategorySeo> = {
  feminino: {
    id: "feminino",
    name: "Feminino",
    title: "Vestidos de Festa e Moda Feminina | Soraia Fernandes",
    description:
      "Vestidos de festa e moda feminina na Soraia Fernandes. Encontre o look perfeito para cada ocasiÃ£o. Compre online com envio para todo o Brasil.",
    h1: "Moda Feminina",
    eyebrow: "ColeÃ§Ã£o Feminina",
    intro: "",
    keywords: ["vestidos de festa", "moda feminina", "vestido de festa", "roupa feminina"],
  },
  masculino: {
    id: "masculino",
    name: "Masculino",
    title: "Vestidos Femininos | Soraia Fernandes",
    description:
      "Vestidos de festa e moda feminina na Soraia Fernandes. Looks exclusivos para casamentos, formaturas e eventos especiais.",
    h1: "Vestidos Femininos",
    eyebrow: "Coleção Feminina",
    intro: "",
    keywords: ["Vestidos Femininos", "vestidos de festa", "moda feminina"],
  },
  promocoes: {
    id: "promocoes",
    name: "PromoÃ§Ãµes",
    title: "PromoÃ§Ãµes Soraia Fernandes â€” Moda com Desconto",
    description:
      "PeÃ§as selecionadas com desconto na Soraia Fernandes. Aproveite as promoções de vestidos femininos enquanto durar o estoque.",
    h1: "PromoÃ§Ãµes",
    eyebrow: "Ofertas da semana",
    intro: "",
    keywords: ["promoÃ§Ã£o de roupas", "moda com desconto", "roupas em promoÃ§Ã£o", "outlet de moda"],
  },
  "recebidos-da-semana": {
    id: "recebidos-da-semana",
    name: "Recebidos da Semana",
    title: "Recebidos da Semana â€” Novidades Soraia Fernandes",
    description:
      "Confira os recebidos da semana na Soraia Fernandes: novidades de vestidos femininos que acabaram de chegar.",
    h1: "Recebidos da Semana",
    eyebrow: "Acabou de chegar",
    intro: "",
    keywords: ["novidades moda", "recebidos da semana", "roupas novas", "lanÃ§amentos de moda"],
  },
};


export function getCategorySeo(id?: string): CategorySeo | null {
  if (!id) return null;
  const direct = CATEGORY_SEO[id];
  if (direct) return direct;

  // Apelidos de coleÃ§Ã£o (ex.: "ultimas", "novidades") reaproveitam o SEO canÃ´nico.
  const kind = resolveCollection(id);
  if (kind === "promo") return CATEGORY_SEO["promocoes"] ?? null;
  if (kind === "recent") return CATEGORY_SEO["recebidos-da-semana"] ?? null;
  return null;
}



