import { create } from "zustand";
import {
  listCategories, createCategoryRemote, updateCategoryRemote, deleteCategoryRemote,
} from "@/lib/api/supaCategories";

export const STORE_ID = "store_js_store";

export type CategoryStatus = "ativo" | "inativo" | "arquivado";

export interface Category {
  id: string; store_id: string; name: string; slug: string;
  description: string; image: string; hover_image: string;
  sort_order: number; featured: boolean;
  show_home: boolean; show_menu: boolean; show_menu_mobile: boolean;
  status: CategoryStatus;
  meta_title: string; meta_description: string;
  product_count: number; created_at: string;
}

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface CategoriesState {
  categories: Category[];
  loaded: boolean;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  create: (c: Omit<Category, "id" | "store_id" | "created_at" | "product_count">) => Promise<Category>;
  update: (id: string, patch: Partial<Category>) => Promise<void>;
  archive: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

let inflight: Promise<void> | null = null;

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  loaded: false,
  hydrate: async () => {
    if (get().loaded) return;
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const list = await listCategories();
        set({ categories: list, loaded: true });
      } catch { /* tabela ainda não criada — ignora */ }
      finally { inflight = null; }
    })();
    return inflight;
  },
  refresh: async () => {
    try {
      const list = await listCategories();
      set({ categories: list, loaded: true });
    } catch { /* ignore */ }
  },
  create: async (c) => {
    const created = await createCategoryRemote(c);
    set((s) => ({ categories: [...s.categories, created].sort((a, b) => a.sort_order - b.sort_order) }));
    return created;
  },
  update: async (id, patch) => {
    await updateCategoryRemote(id, patch);
    set((s) => ({
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c))
        .sort((a, b) => a.sort_order - b.sort_order),
    }));
  },
  archive: async (id) => {
    await updateCategoryRemote(id, { status: "arquivado" });
    set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, status: "arquivado" } : c)) }));
  },
  remove: async (id) => {
    await deleteCategoryRemote(id);
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
  },
}));

export const emptyCategory = (): Omit<Category, "id" | "store_id" | "created_at" | "product_count"> => ({
  name: "", slug: "", description: "", image: "", hover_image: "",
  sort_order: 99, featured: false, show_home: true, show_menu: true, show_menu_mobile: true,
  status: "ativo", meta_title: "", meta_description: "",
});
