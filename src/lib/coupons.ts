import { supabase } from "@/integrations/supabase/client";

export interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  expires_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
}

export async function loadCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Coupon[];
}

export async function saveCoupon(coupon: Omit<Coupon, "id" | "created_at" | "usage_count">) {
  const { error } = await supabase
    .from("coupons")
    .upsert(
      {
        ...coupon,
        code: coupon.code.toUpperCase().trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "code" },
    );
  if (error) throw new Error(error.message);
}

export async function deleteCoupon(id: string) {
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function validateCoupon(code: string): Promise<Coupon | null> {
  const c = code.toUpperCase().trim();
  const coupons = await loadCoupons();
  const coupon = coupons.find(x => x.code === c && x.is_active);
  
  if (!coupon) return null;
  
  // Expiry check
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return null;
  
  // Usage limit check
  if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) return null;
  
  return coupon;
}

export function calculateDiscount(subtotal: number, coupon: Coupon): number {
  if (coupon.type === "percentage") {
    return (subtotal * coupon.value) / 100;
  }
  return Math.min(subtotal, coupon.value);
}
