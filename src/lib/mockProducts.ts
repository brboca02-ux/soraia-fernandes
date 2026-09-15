import { useProductsStore, type Product } from "@/stores/productsStore";
import type { ShopifyProduct } from "@/lib/shopify";

// Converte um Product mocado (admin) para o formato ShopifyProduct usado pela vitrine.
export function productToShopify(p: Product): ShopifyProduct {
  const price = (p.sale_price ?? p.price).toFixed(2);
  const images = p.images.length
    ? p.images
    : [{ id: "ph", product_id: p.id, url: `https://picsum.photos/seed/${p.slug}/800/1000`, position: 0, is_primary: true }];

  return {
    node: {
      id: `mock:${p.id}`,
      title: p.name,
      description: p.description,
      handle: p.slug,
      productType: p.category_id,
      tags: [p.category_id],
      totalInventory: p.stock,
      priceRange: { minVariantPrice: { amount: price, currencyCode: "BRL" } },
      images: { edges: images.map((i) => ({ node: { url: i.url, altText: p.name } })) },
        variants: {
        edges: (p.variants.length
          ? p.variants
          : [{ id: `v_${p.id}`, product_id: p.id, size: "Único", color: "Padrão", stock: p.stock, color_hex: null }]
        ).map((v) => ({
          node: {
            id: `mock:${v.id}`,
            title: `${v.size} / ${v.color}`,
            price: { amount: price, currencyCode: "BRL" },
            availableForSale: v.stock > 0,
            quantityAvailable: v.stock,
            selectedOptions: [
              { name: "Tamanho", value: String(v.size) },
              { name: "Cor", value: v.color },
            ],
            colorHex: v.color_hex ?? null,
          },
        })),
      },
      options: [
        { name: "Tamanho", values: [...new Set(p.variants.map((v) => String(v.size)))] },
        { name: "Cor", values: [...new Set(p.variants.map((v) => v.color))] },
      ],
    },
  };
}

// Pega produtos mocados filtrados por uma string de query simples (categoria ou título).
export function getMockShopifyProducts(opts: { query?: string; first?: number } = {}): ShopifyProduct[] {
  const all = useProductsStore.getState().products.filter((p) => p.status === "ativo");
  const q = (opts.query ?? "").toLowerCase();
  const filtered = q
    ? all.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category_id.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      )
    : all;
  return filtered.slice(0, opts.first ?? 12).map(productToShopify);
}
