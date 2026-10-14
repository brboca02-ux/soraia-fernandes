import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/stores/cartStore";

export type Promotion = {
  id: string;
  name: string;
  active: boolean;
  mode: "percentage" | "fixed_price";
  value: number;
  product_ids: string[];
  minimum_subtotal: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PromotionQuote = {
  subtotal: number;
  discount: number;
  total: number;
  promotion_id: string | null;
  promotion_name: string | null;
  coupon_applied: boolean;
};

export function cartProductId(item: CartItem): string {
  const raw = item.product?.node?.id || item.variantId || "";
  return raw.split("/").pop()?.replace(/^mock:/, "") ?? "";
}

export async function quotePromotions(items: CartItem[], couponCode?: string): Promise<PromotionQuote> {
  const { data, error } = await supabase.rpc("quote_promotions", {
    p_items: items.map((item) => ({ product_id: cartProductId(item), quantity: item.quantity })),
    p_coupon_code: couponCode || undefined,
  });
  if (error) throw new Error(error.message);
  return data as PromotionQuote;
}

export async function listPromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Promotion[];
}

export async function savePromotion(promotion: Omit<Promotion, "id" | "created_at" | "updated_at"> & { id?: string }) {
  const row = { ...promotion, updated_at: new Date().toISOString() };
  const { error } = promotion.id
    ? await supabase.from("promotions").update(row).eq("id", promotion.id)
    : await supabase.from("promotions").insert(row);
  if (error) throw new Error(error.message);
}

export async function deletePromotion(id: string) {
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export interface Campaign {
  id: string;
  name?: string;
  product_ids: string[];
  is_active: boolean;
}

// src/lib/promotions.ts

/**
 * 1. Busca a campanha ativa atual (ex: "Vestidos selecionados").
 */
export async function getActiveCampaign(): Promise<Promotion | null> {
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar campanha ativa:", error);
    return null;
  }
  return data as Promotion | null;
}

/**
 * 2. Atualiza a participação do produto na campanha ativa.
 * - Se participate === true: adiciona o productId em product_ids da campanha.
 * - Se participate === false: remove o productId do array.
 */
export async function setProductInActiveCampaign(
  productId: string,
  participate: boolean
): Promise<void> {
  if (!productId) return;

  // Busca a campanha ativa atual
  const campaign = await getActiveCampaign();
  if (!campaign) return;

  const { error } = await supabase.rpc("set_product_in_campaign", {
    p_campaign: campaign.id,
    p_product: productId,
    p_participate: participate,
  });

  if (error) {
    console.error("Erro ao atualizar campanha ativa:", error);
    throw new Error(
      error.message.includes("forbidden")
        ? "Entre como administrador para alterar a promoção."
        : "Falha ao atualizar participantes da promoção.",
    );
  }
}
