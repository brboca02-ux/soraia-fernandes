// SEO textual único por categoria — títulos, descrições e copy de intro
// usados na página /colecao?c=<id> para reforçar ranqueamento long-tail.
import { resolveCollection } from "@/lib/collections";


export interface CategorySeo {
  id: string;
  name: string;
  title: string;         // <title>
  description: string;   // meta description (≤160)
  h1: string;            // H1 na página
  eyebrow: string;       // "olho" acima do H1
  intro: string;         // parágrafo de contexto (rico em keywords, natural)
  keywords: string[];    // palavras-chave alvo (para <meta name="keywords">)
}

export const CATEGORY_SEO: Record<string, CategorySeo> = {
  feminino: {
    id: "feminino",
    name: "Feminino",
    title: "Vestidos de Festa e Moda Feminina | Soraia Fernandes",
    description:
      "Vestidos de festa e moda feminina na Soraia Fernandes. Encontre o look perfeito para cada ocasião. Compre online com envio para todo o Brasil.",
    h1: "Moda Feminina",
    eyebrow: "Coleção Feminina",
    intro: "",
    keywords: ["vestidos de festa", "moda feminina", "vestido de festa", "roupa feminina"],
  },
  masculino: {
    id: "masculino",
    name: "Masculino",
    title: "Moda Masculina | Soraia Fernandes",
    description:
      "Roupas masculinas na Soraia Fernandes. Looks modernos e elegantes para todas as ocasiões. Loja com envio para todo o Brasil.",
    h1: "Moda Masculina",
    eyebrow: "Coleção Masculina",
    intro: "",
    keywords: ["moda masculina", "roupas masculinas", "look masculino"],
  },
  promocoes: {
    id: "promocoes",
    name: "Promoções",
    title: "Promoções Soraia Fernandes — Moda com Desconto",
    description:
      "Peças selecionadas com desconto na Soraia Fernandes. Aproveite as promoções de moda feminina e masculina enquanto durar o estoque.",
    h1: "Promoções",
    eyebrow: "Ofertas da semana",
    intro: "",
    keywords: ["promoção de roupas", "moda com desconto", "roupas em promoção", "outlet de moda"],
  },
  "recebidos-da-semana": {
    id: "recebidos-da-semana",
    name: "Recebidos da Semana",
    title: "Recebidos da Semana — Novidades Soraia Fernandes",
    description:
      "Confira os recebidos da semana na Soraia Fernandes: novidades de moda feminina e masculina que acabaram de chegar.",
    h1: "Recebidos da Semana",
    eyebrow: "Acabou de chegar",
    intro: "",
    keywords: ["novidades moda", "recebidos da semana", "roupas novas", "lançamentos de moda"],
  },
};


export function getCategorySeo(id?: string): CategorySeo | null {
  if (!id) return null;
  const direct = CATEGORY_SEO[id];
  if (direct) return direct;

  // Apelidos de coleção (ex.: "ultimas", "novidades") reaproveitam o SEO canônico.
  const kind = resolveCollection(id);
  if (kind === "promo") return CATEGORY_SEO["promocoes"] ?? null;
  if (kind === "recent") return CATEGORY_SEO["recebidos-da-semana"] ?? null;
  return null;
}

