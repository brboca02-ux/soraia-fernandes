import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PRODUCTS_QUERY, storefrontApiRequest, type ShopifyProduct } from "@/lib/shopify";
import { useProductsStore } from "@/stores/productsStore";
import { productToShopify } from "@/lib/mockProducts";
import { ProductCard } from "./ProductCard";
import { resolveCollection } from "@/lib/collections";


interface FetchOpts {
  query?: string;
  first?: number;
  sortKey?: "CREATED_AT" | "BEST_SELLING" | "PRICE" | "TITLE" | "UPDATED_AT" | "RELEVANCE";
  reverse?: boolean;
}

async function fetchShopify({ query, first = 12, sortKey, reverse }: FetchOpts): Promise<ShopifyProduct[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const data = await Promise.race([
      storefrontApiRequest(PRODUCTS_QUERY, {
        first, query: query ?? null,
        sortKey: sortKey ?? null, reverse: reverse ?? null,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
    ]);
    clearTimeout(timeout);
    return (((data as { data?: { products?: { edges?: ShopifyProduct[] } } })?.data?.products?.edges) ?? []) as ShopifyProduct[];
  } catch {
    return [];
  }
}

export function ProductGrid({
  query, first = 12, sortKey, reverse, emptyHint = true, size = "default",
  columns = { mobile: 2, lg: 5 },
}: { 
  query?: string; 
  first?: number; 
  sortKey?: FetchOpts["sortKey"]; 
  reverse?: boolean; 
  emptyHint?: boolean; 
  size?: "default" | "compact";
  columns?: { mobile?: number; tablet?: number; desktop?: number; lg?: number };
}) {
  // Fonte primária: Supabase (via store). Reativo: re-renderiza ao hidratar/CRUD.
  const products = useProductsStore((s) => s.products);
  const loading = useProductsStore((s) => s.loading);
  const loaded = useProductsStore((s) => s.loaded);

  const hasSupabaseProducts = products.some((p) => p.status === "ativo");

  // Shopify só como fallback quando não há produtos no Supabase.
  const { data: shopifyData } = useQuery({
    queryKey: ["shopify-products", query ?? "all", first, sortKey ?? "default", reverse ?? false],
    queryFn: () => fetchShopify({ query, first, sortKey, reverse }),
    staleTime: 60_000,
    enabled: loaded && !hasSupabaseProducts,
  });

  const items = useMemo<ShopifyProduct[]>(() => {
    const q = (query ?? "").toLowerCase();
    const collection = resolveCollection(q);
    const active = products.filter((p) => p.status === "ativo");

    let filtered = active;
    if (collection === "promo") {
      filtered = active.filter((p) => p.sale_price != null && p.sale_price > 0 && p.sale_price < p.price);
    } else if (collection === "recent") {
      filtered = [...active].sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else if (q) {
      filtered = active.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category_id.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }

    if (!collection) {
      if (sortKey === "CREATED_AT") {
        filtered = [...filtered].sort((a, b) => (reverse ? b.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(b.created_at)));
      } else if (sortKey === "PRICE") {
        filtered = [...filtered].sort((a, b) => (reverse ? b.price - a.price : a.price - b.price));
      } else if (sortKey === "TITLE") {
        filtered = [...filtered].sort((a, b) => (reverse ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)));
      }
    }

    const fromSupabase = filtered.slice(0, first).map(productToShopify);
    if (fromSupabase.length > 0) return fromSupabase;
    return shopifyData ?? [];
  }, [products, query, first, sortKey, reverse, shopifyData]);


  const gridCols = useMemo(() => {
    const mobile = columns.mobile ?? 2;
    const tablet = columns.tablet ?? 3;
    const lg = columns.lg ?? 4;
    const desktop = columns.desktop ?? lg;
    
    return `grid-cols-${mobile} md:grid-cols-${tablet} lg:grid-cols-${lg} xl:grid-cols-${desktop} 2xl:grid-cols-6`;
  }, [columns]);

  if ((!loaded && loading) || (!loaded && items.length === 0)) {
    return (
      <div className={`grid ${gridCols} gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-8 md:gap-x-6 md:gap-y-12`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-md bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return emptyHint ? (
      <div className="py-16 text-center border border-dashed border-border rounded-md">
        <p className="font-display text-2xl mb-2">
          {query ? "Nenhum produto encontrado" : "Coleção em preparação"}
        </p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto px-4">
          {query ? "Tente outro termo, categoria ou cor." : "Em breve novidades. Volte mais tarde ou fale com a gente no WhatsApp."}
        </p>
      </div>
    ) : null;
  }

  return (
    <div className={`grid ${gridCols} gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-8 md:gap-x-6 md:gap-y-12 items-stretch`}>
      {items.map((p) => (
        <div key={p.node.id} className="flex">
          <ProductCard product={p} size={size} />
        </div>
      ))}
    </div>
  );
}
