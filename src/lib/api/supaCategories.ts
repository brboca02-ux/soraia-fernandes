import { supabase } from "@/integrations/supabase/client";
import type { Category } from "@/stores/categoriesStore";
import type { TablesUpdate } from "@/integrations/supabase/types";

const STORE_ID = "store_js_store";

type DbCategory = {
  id: string; slug: string; name: string; description: string | null;
  image: string | null; sort_order: number;
  status: "ativo" | "inativo" | "arquivado";
  show_home: boolean; show_menu: boolean; created_at: string;
};

function rowToCat(r: DbCategory): Category {
  return {
    id: r.id, store_id: STORE_ID, name: r.name, slug: r.slug,
    description: r.description ?? "", image: r.image ?? "", hover_image: "",
    sort_order: r.sort_order, featured: false,
    show_home: r.show_home, show_menu: r.show_menu, show_menu_mobile: r.show_menu,
    status: r.status, meta_title: "", meta_description: "",
    product_count: 0, created_at: r.created_at,
  };
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("sort_order");
  if (error) throw error;
  return (data as DbCategory[]).map(rowToCat);
}

export async function createCategoryRemote(c: Omit<Category, "id" | "store_id" | "created_at" | "product_count">): Promise<Category> {
  const { data, error } = await supabase.from("categories").insert({
    slug: c.slug, name: c.name, description: c.description,
    image: c.image, sort_order: c.sort_order, status: c.status,
    show_home: c.show_home, show_menu: c.show_menu,
  }).select("*").single();
  if (error) throw error;
  return rowToCat(data as DbCategory);
}

export async function updateCategoryRemote(id: string, patch: Partial<Category>): Promise<void> {
  const fields: TablesUpdate<"categories"> = {};
  if (patch.name !== undefined) fields.name = patch.name;
  if (patch.slug !== undefined) fields.slug = patch.slug;
  if (patch.description !== undefined) fields.description = patch.description;
  if (patch.image !== undefined) fields.image = patch.image;
  if (patch.sort_order !== undefined) fields.sort_order = patch.sort_order;
  if (patch.status !== undefined) fields.status = patch.status;
  if (patch.show_home !== undefined) fields.show_home = patch.show_home;
  if (patch.show_menu !== undefined) fields.show_menu = patch.show_menu;
  const { error } = await supabase.from("categories").update(fields).eq("id", id);
  if (error) throw error;
}

export async function deleteCategoryRemote(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
