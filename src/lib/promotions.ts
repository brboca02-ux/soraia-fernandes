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