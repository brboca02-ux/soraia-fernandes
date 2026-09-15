import { toast } from "sonner";

export const SHOPIFY_API_VERSION = "2025-07";
export const SHOPIFY_STORE_PERMANENT_DOMAIN = "aura-boutique-u79e9.myshopify.com";
export const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
export const SHOPIFY_STOREFRONT_TOKEN = "e7b6f8596fe2ff012a17ffc6a00d11fb";

// ====== Soraia Fernandes — Vestidos de Festa ======
export const STORE_INFO = {
  name: "Soraia Fernandes",
  city: "Joinville",
  region: "SC",
  country: "BR",
  street: "R. Evaldo Martin Junkes, 820 - Loja 4 - Aventureiro",
  postalCode: "89225-673",
  phone: "+55 47 99189-9393",
  whatsapp: "5547991899393",
  mapsEmbed:
    "https://www.google.com/maps?q=R.+Evaldo+Martin+Junkes%2C+820+-+Loja+4+-+Aventureiro%2C+Joinville%2C+Santa+Catarina%2C+Brazil+89225-673&output=embed",
};

export interface ShopifyVariantNode {
  id: string;
  title: string;
  price: { amount: string; currencyCode: string };
  availableForSale: boolean;
  quantityAvailable?: number | null;
  selectedOptions: Array<{ name: string; value: string }>;
  colorHex?: string | null;
}

export interface ShopifyMediaNode {
  mediaContentType: "IMAGE" | "VIDEO" | "EXTERNAL_VIDEO" | "MODEL_3D";
  previewImage?: { url: string } | null;
  sources?: Array<{ url: string; mimeType: string; format?: string }>;
}

export interface ShopifyProduct {
  node: {
    id: string;
    title: string;
    description: string;
    handle: string;
    productType?: string;
    tags?: string[];
    totalInventory?: number | null;
    priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
    images: { edges: Array<{ node: { url: string; altText: string | null } }> };
    media?: { edges: Array<{ node: ShopifyMediaNode }> };
    variants: { edges: Array<{ node: ShopifyVariantNode }> };
    options: Array<{ name: string; values: string[] }>;
  };
}

export async function storefrontApiRequest(query: string, variables: Record<string, unknown> = {}) {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 402) {
    toast.error("Shopify: pagamento necessário", {
      description: "Sua loja precisa de um plano ativo. Acesse admin.shopify.com para fazer upgrade.",
    });
    return;
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.errors) throw new Error(data.errors.map((e: { message: string }) => e.message).join(", "));
  return data;
}

const PRODUCT_FIELDS = `
  id title description handle productType tags totalInventory
  priceRange { minVariantPrice { amount currencyCode } }
  images(first: 6) { edges { node { url altText } } }
  media(first: 8) {
    edges { node {
      mediaContentType
      ... on MediaImage { previewImage { url } }
      ... on Video { previewImage { url } sources { url mimeType format } }
      ... on ExternalVideo { previewImage { url } host originUrl }
    } }
  }
  variants(first: 20) {
    edges { node {
      id title availableForSale quantityAvailable
      price { amount currencyCode }
      selectedOptions { name value }
    } }
  }
  options { name values }
`;

export const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
      edges { node { ${PRODUCT_FIELDS} } }
    }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = `
  query GetProduct($handle: String!) {
    product(handle: $handle) { ${PRODUCT_FIELDS} }
  }
`;

export const SEARCH_SUGGESTIONS_QUERY = `
  query Suggest($query: String!) {
    products(first: 6, query: $query) {
      edges { node {
        id title handle
        priceRange { minVariantPrice { amount currencyCode } }
        images(first: 1) { edges { node { url altText } } }
      } }
    }
  }
`;

export function formatPrice(amount: string | number, currency = "BRL") {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function buildWhatsAppLink(message: string) {
  return `https://wa.me/${STORE_INFO.whatsapp}?text=${encodeURIComponent(message)}`;
}

/** Deep-link para conversar com um cliente específico (número dele). */
export function buildCustomerWhatsAppLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  // Adiciona 55 (Brasil) quando o número parece nacional sem DDI.
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

/** Mensagem padrão de "pagamento confirmado" para enviar ao cliente. */
export function buildOrderPaidMessage(params: {
  customerName?: string | null;
  orderNumber: string;
  total: number;
  trackingUrl: string;
}) {
  const nome = params.customerName?.split(" ")[0] ?? "Cliente";
  const totalStr = formatPrice(params.total, "BRL");
  return (
    `Oi ${nome}! Aqui é a Soraia Fernandes 💛\n\n` +
    `Seu pagamento do pedido *${params.orderNumber}* (${totalStr}) foi confirmado! ✅\n\n` +
    `Já estamos preparando tudo com carinho. Você pode acompanhar cada etapa por aqui:\n${params.trackingUrl}\n\n` +
    `Qualquer dúvida, é só responder essa mensagem. Obrigada pela confiança! ✨`
  );
}

/** Mensagem para avisar avanço de etapa (retirada/entrega) via WhatsApp. */
export function buildStageMessage(params: {
  customerName?: string | null;
  orderNumber: string;
  stageLabel: string;
  stageDescription?: string;
  trackingUrl: string;
}) {
  const nome = params.customerName?.split(" ")[0] ?? "Cliente";
  return (
    `Oi ${nome}! 💛\n\n` +
    `Atualização do seu pedido *${params.orderNumber}*:\n` +
    `➡️ *${params.stageLabel}*\n` +
    (params.stageDescription ? `${params.stageDescription}\n` : "") +
    `\nAcompanhe em tempo real:\n${params.trackingUrl}\n\n` +
    `— Soraia Fernandes`
  );
}
