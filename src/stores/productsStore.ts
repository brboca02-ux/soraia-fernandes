import { create } from "zustand";
import {
  listAllProducts, createProduct as apiCreate, updateProduct as apiUpdate,
  archiveProductRemote, deleteProductRemote, adjustStockRemote, setStockRemote,
} from "@/lib/api/supaProducts";

export const STORE_ID = "store_js_store";

export const CATEGORIES = [
  { id: "feminino", name: "Feminino" },
  { id: "masculino", name: "Masculino" },
] as const;

export const SIZES = ["PP", "P", "M", "G", "GG", "XG"] as const;
export type Size = (typeof SIZES)[number];

export interface ProductImage {
  id: string; product_id: string; url: string;
  position: number; is_primary: boolean;
}

export interface ProductVariant {
  id: string; product_id: string;
  size: Size | string; color: string; stock: number;
  color_hex?: string | null;
}

export type ProductStatus = "ativo" | "inativo" | "arquivado";

export interface Product {
  id: string; store_id: string; name: string; slug: string;
  description: string; category_id: string; brand: string; sku: string;
  price: number; sale_price: number | null;
  stock: number; reserved_stock: number; minimum_stock: number;
  track_stock: boolean; weight: number;
  status: ProductStatus;
  showcase: boolean;
  meta_title: string; meta_description: string;
  images: ProductImage[]; variants: ProductVariant[];
  created_at: string;
}

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface ProductsState {
  products: Product[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  list: () => Product[];
  get: (id: string) => Product | undefined;
  create: (p: Omit<Product, "id" | "store_id" | "created_at">) => Promise<Product>;
  update: (id: string, p: Partial<Product>) => Promise<void>;
  duplicate: (id: string) => Promise<Product | undefined>;
  archive: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  adjustStock: (id: string, delta: number) => Promise<void>;
  setStock: (id: string, value: number) => Promise<void>;
  toggleShowcase: (id: string) => Promise<void>;
}

let inflight: Promise<void> | null = null;

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  loaded: false,
  loading: false,
  error: null,

  hydrate: async () => {
    if (get().loaded || get().loading) return inflight ?? undefined;
    set({ loading: true, error: null });
    inflight = (async () => {
      try {
        const list = await listAllProducts();
        set({ products: list, loaded: true, loading: false });
      } catch (e) {
        set({ error: (e as Error).message, loading: false });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },

  refresh: async () => {
    try {
      const list = await listAllProducts();
      set({ products: list, loaded: true, error: null });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  list: () => get().products,
  get: (id) => get().products.find((p) => p.id === id),

  create: async (p) => {
    const created = await apiCreate(p);
    set((s) => ({ products: [created, ...s.products] }));
    return created;
  },

  update: async (id, patch) => {
    await apiUpdate(id, patch as Parameters<typeof apiUpdate>[1]);
    await get().refresh();
  },

  duplicate: async (id) => {
    const orig = get().products.find((p) => p.id === id);
    if (!orig) return undefined;
    const copy = await apiCreate({
      name: orig.name + " (cópia)", slug: orig.slug + "-copia-" + Date.now(),
      description: orig.description, category_id: orig.category_id,
      brand: orig.brand, sku: (orig.sku || "") + "-COPY",
      price: orig.price, sale_price: orig.sale_price, stock: orig.stock,
      reserved_stock: orig.reserved_stock, minimum_stock: orig.minimum_stock,
      track_stock: orig.track_stock, weight: orig.weight, status: orig.status,
      showcase: orig.showcase,
      meta_title: orig.meta_title, meta_description: orig.meta_description,
      images: orig.images, variants: orig.variants,
    });
    set((s) => ({ products: [copy, ...s.products] }));
    return copy;
  },

  toggleShowcase: async (id) => {
    const p = get().products.find((x) => x.id === id);
    if (!p) return;
    const next = !p.showcase;
    await apiUpdate(id, { showcase: next });
    set((s) => ({
      products: s.products.map((x) => (x.id === id ? { ...x, showcase: next } : x)),
    }));
  },

  archive: async (id) => {
    await archiveProductRemote(id);
    set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, status: "arquivado" } : p)) }));
  },

  remove: async (id) => {
    await deleteProductRemote(id);
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
  },

  adjustStock: async (id, delta) => {
    await adjustStockRemote(id, delta);
    set((s) => ({
      products: s.products.map((p) => (p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p)),
    }));
  },

  setStock: async (id, value) => {
    await setStockRemote(id, value);
    set((s) => ({
      products: s.products.map((p) => (p.id === id ? { ...p, stock: Math.max(0, value) } : p)),
    }));
  },
}));

export const emptyProduct = (): Omit<Product, "id" | "store_id" | "created_at"> => ({
  name: "", slug: "", description: "", category_id: "feminino", brand: "Soraia Fernandes",
  sku: "", price: 0, sale_price: null, stock: 0, reserved_stock: 0,
  minimum_stock: 5, track_stock: true, weight: 0, status: "ativo",
  showcase: false,
  meta_title: "", meta_description: "", images: [], variants: [],
});

// ---------- Stock helpers ----------
export type StockLevel = "critico" | "baixo" | "normal" | "esgotado";

type StockShape = Pick<Product, "stock" | "minimum_stock" | "track_stock"> & {
  variants?: ProductVariant[];
};

/**
 * Estoque real do produto: quando existem variantes (tamanhos), o total é a
 * soma das variantes — é ela que manda na vitrine. Sem variantes, usa o campo
 * de estoque simples do produto.
 */
export function effectiveStock(p: StockShape): number {
  if (p.variants && p.variants.length > 0) {
    return p.variants.reduce((sum, v) => sum + Math.max(0, v.stock || 0), 0);
  }
  return Math.max(0, p.stock || 0);
}

export function stockLevel(p: StockShape): StockLevel {
  if (!p.track_stock) return "normal";
  const total = effectiveStock(p);
  const min = p.minimum_stock || 5;
  if (total <= 0) return "esgotado";
  if (total <= Math.max(1, Math.min(2, min))) return "critico";
  if (total <= min) return "baixo";
  return "normal";
}

/** Status de uma variante isolada, usando o mínimo definido no produto. */
export function variantLevel(
  v: Pick<ProductVariant, "stock">,
  p: Pick<Product, "minimum_stock" | "track_stock">,
): StockLevel {
  if (!p.track_stock) return "normal";
  const min = p.minimum_stock || 5;
  if (v.stock <= 0) return "esgotado";
  if (v.stock <= Math.max(1, Math.min(2, min))) return "critico";
  if (v.stock <= min) return "baixo";
  return "normal";
}

export function stockStatusLabel(level: StockLevel): string {
  return level === "esgotado" ? "Esgotado"
    : level === "critico" ? "Crítico"
    : level === "baixo" ? "Estoque Baixo"
    : "Em Estoque";
}
