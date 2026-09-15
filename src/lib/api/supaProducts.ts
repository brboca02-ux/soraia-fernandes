import { supabase } from "@/integrations/supabase/client";
import type { Product, ProductImage, ProductVariant, ProductStatus } from "@/stores/productsStore";

// ----- Helpers -----------------------------------------------------------
const STORE_ID = "store_js_store";

type DbProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category_id: string;
  brand: string | null;
  sku: string | null;
  price: number | string;
  sale_price: number | string | null;
  stock: number;
  reserved_stock: number;
  minimum_stock: number;
  track_stock: boolean;
  weight: number | string;
  status: ProductStatus;
  showcase: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  product_images?: { id: string; url: string; position: number; is_primary: boolean }[];
  product_variants?: { id: string; size: string; color: string; color_hex: string | null; stock: number }[];
};

const num = (v: number | string | null | undefined) =>
  v == null ? 0 : typeof v === "number" ? v : Number(v);

function rowToProduct(r: DbProduct): Product {
  const images: ProductImage[] = (r.product_images ?? [])
    .sort((a, b) => a.position - b.position)
    .map((i) => ({
      id: i.id, product_id: r.id, url: i.url,
      position: i.position, is_primary: i.is_primary,
    }));
  const variants: ProductVariant[] = (r.product_variants ?? []).map((v) => ({
    id: v.id, product_id: r.id, size: v.size, color: v.color, color_hex: v.color_hex ?? null, stock: v.stock,
  }));
  return {
    id: r.id, store_id: STORE_ID,
    name: r.name, slug: r.slug,
    description: r.description ?? "",
    category_id: r.category_id,
    brand: r.brand ?? "Soraia Fernandes",
    sku: r.sku ?? "",
    price: num(r.price),
    sale_price: r.sale_price == null ? null : num(r.sale_price),
    stock: r.stock,
    reserved_stock: r.reserved_stock,
    minimum_stock: r.minimum_stock,
    track_stock: r.track_stock,
    weight: num(r.weight),
    status: r.status,
    showcase: r.showcase,
    meta_title: r.meta_title ?? "",
    meta_description: r.meta_description ?? "",
    images, variants,
    created_at: r.created_at,
  };
}

const SELECT =
  "id, slug, name, description, category_id, brand, sku, price, sale_price, stock, reserved_stock, minimum_stock, track_stock, weight, status, showcase, meta_title, meta_description, created_at, product_images(id,url,position,is_primary), product_variants(id,size,color,color_hex,stock)";

// ----- Reads -------------------------------------------------------------
export async function listAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products").select(SELECT).in("category_id", ["feminino", "masculino"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  
  // Apenas categorias Masculino e Feminino
  const allowedCategories = ["masculino", "feminino"];
  return (data as DbProduct[])
    .map(rowToProduct)
    .filter(p => allowedCategories.includes(p.category_id));
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products").select(SELECT).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? rowToProduct(data as DbProduct) : null;
}

// ----- Writes (admin via RLS) -------------------------------------------
type ProductInput = Omit<Product, "id" | "store_id" | "created_at">;

export async function createProduct(p: ProductInput): Promise<Product> {
  const { data: row, error } = await supabase.from("products").insert({
    slug: p.slug, name: p.name, description: p.description,
    category_id: p.category_id, brand: p.brand, sku: p.sku,
    price: p.price, sale_price: p.sale_price, stock: p.stock,
    reserved_stock: p.reserved_stock, minimum_stock: p.minimum_stock,
    track_stock: p.track_stock, weight: p.weight, status: p.status,
    showcase: p.showcase,
    meta_title: p.meta_title, meta_description: p.meta_description,
  }).select("id").single();
  if (error) throw error;
  await replaceImagesAndVariants(row.id, p.images, p.variants);
  const out = await getProductBySlug(p.slug);
  if (!out) throw new Error("Produto criado mas não encontrado");
  return out;
}

export async function updateProduct(id: string, patch: Partial<ProductInput>): Promise<void> {
  const fields: Partial<Record<(typeof PRODUCT_FIELDS)[number], never>> = {};
  const assign = fields as Record<string, unknown>;
  for (const k of PRODUCT_FIELDS) {
    if (patch[k] !== undefined) assign[k] = patch[k];
  }
  if (Object.keys(fields).length) {
    const { error } = await supabase.from("products").update(fields).eq("id", id);
    if (error) throw error;
  }
  if (patch.images || patch.variants) {
    await replaceImagesAndVariants(id, patch.images, patch.variants);
  }
}

const PRODUCT_FIELDS = [
    "slug","name","description","category_id","brand","sku","price","sale_price",
    "stock","reserved_stock","minimum_stock","track_stock","weight","status",
    "showcase",
    "meta_title","meta_description",
] as const;

export async function archiveProductRemote(id: string): Promise<void> {
  const { error } = await supabase.from("products").update({ status: "arquivado" }).eq("id", id);
  if (error) throw error;
}

export async function deleteProductRemote(id: string): Promise<void> {
  // Remove dependências primeiro (evita bloqueio por FK)
  await supabase.from("product_images").delete().eq("product_id", id);
  await supabase.from("product_variants").delete().eq("product_id", id);

  const { data, error } = await supabase
    .from("products").delete().eq("id", id).select("id");
  if (error) {
    if ((error as { code?: string }).code === "23503") {
      throw new Error(
        "Este produto está vinculado a pedidos e não pode ser apagado. Use Arquivar para tirá-lo da loja.",
      );
    }
    throw new Error(error.message);
  }
  // RLS pode bloquear silenciosamente (0 linhas afetadas, sem erro)
  if (!data || data.length === 0) {
    throw new Error(
      "Não foi possível apagar: sua conta não tem permissão de administrador. Saia e entre novamente para atualizar as permissões.",
    );
  }
}

export async function setStockRemote(id: string, value: number): Promise<void> {
  const { error } = await supabase.from("products").update({ stock: Math.max(0, value) }).eq("id", id);
  if (error) throw error;
}

export async function adjustStockRemote(id: string, delta: number): Promise<void> {
  // read then write — race ok para painel pequeno
  const { data, error } = await supabase.from("products").select("stock").eq("id", id).single();
  if (error) throw error;
  const next = Math.max(0, (data?.stock ?? 0) + delta);
  await setStockRemote(id, next);
}

async function replaceImagesAndVariants(
  productId: string,
  images?: ProductImage[],
  variants?: ProductVariant[],
) {
  if (images) {
    await supabase.from("product_images").delete().eq("product_id", productId);
    if (images.length) {
      const rows = images.map((i, idx) => ({
        product_id: productId, url: i.url,
        position: idx, is_primary: i.is_primary || idx === 0,
      }));
      const { error } = await supabase.from("product_images").insert(rows);
      if (error) throw error;
    }
  }
  if (variants) {
    await supabase.from("product_variants").delete().eq("product_id", productId);
    if (variants.length) {
      const rows = variants.map((v) => ({
        product_id: productId, size: String(v.size), color: v.color, color_hex: v.color_hex ?? null, stock: v.stock,
      }));
      const { error } = await supabase.from("product_variants").insert(rows);
      if (error) throw error;
    }
  }
}

// ----- Storage upload ----------------------------------------------------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function uploadProductImage(file: File): Promise<string> {
  // Normaliza para 3:4 com fundo detectado, reescala e converte para webp
  // — assim a vitrine usa object-cover sem cortar nenhuma peça.
  const { normalizeProductImage } = await import("@/lib/imageProcessing");
  const processed = await normalizeProductImage(file).catch(() => file);
  const ext = (processed.name?.split(".").pop() || "webp").toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // Envios grandes podem falhar por instabilidade de rede ("Failed to fetch").
  // Tentamos até 3 vezes com pequeno intervalo antes de desistir.
  let lastMessage = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { error } = await supabase.storage.from("product-images").upload(path, processed, {
        cacheControl: "31536000", upsert: true, contentType: processed.type || "image/webp",
      });
      if (!error) {
        // O bucket é privado neste workspace, então servimos por uma rota de proxy
        // pública somente-leitura (URL estável, sem expiração).
        return `/api/public/img/${path}`;
      }
      lastMessage = error.message;
    } catch (e) {
      lastMessage = (e as Error).message || "Failed to fetch";
    }
    if (attempt < 3) await sleep(attempt * 800);
  }

  const friendly = /failed to fetch|network|load failed/i.test(lastMessage)
    ? `Falha de rede ao enviar a imagem "${file.name}". Verifique sua conexão e tente novamente (fotos menores enviam mais rápido).`
    : `Erro ao enviar a imagem "${file.name}": ${lastMessage}`;
  throw new Error(friendly);
}



// ----- Stock movements ---------------------------------------------------
export type DbMovement = {
  id: string; product_id: string; product_name: string;
  type: "entrada" | "saida" | "ajuste"; quantity: number;
  reason: string; notes: string; user_id: string | null;
  user_name: string; created_at: string;
};

export async function listMovements(): Promise<DbMovement[]> {
  const { data, error } = await supabase.from("stock_movements").select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbMovement[];
}

export async function recordMovementRemote(input: {
  product_id: string; product_name: string;
  type: "entrada" | "saida" | "ajuste"; quantity: number;
  reason?: string; notes?: string;
}): Promise<DbMovement> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("stock_movements").insert({
    product_id: input.product_id, product_name: input.product_name,
    type: input.type, quantity: input.quantity,
    reason: input.reason ?? "", notes: input.notes ?? "",
    user_id: u.user?.id ?? null, user_name: u.user?.email ?? "Admin",
  }).select("*").single();
  if (error) throw error;
  return data as DbMovement;
}

// ----- Admin role check --------------------------------------------------
export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: u.user.id, _role: "admin",
  });
  if (error) return false;
  return !!data;
}