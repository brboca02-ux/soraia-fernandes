import { supabase } from "@/integrations/supabase/client";

export interface AbandonedCart {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  cart_data: any;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  last_updated_at: string;
  recovered_at: string | null;
  order_id: string | null;
  created_at: string;
}

export async function upsertAbandonedCart(input: Partial<AbandonedCart>) {
  if (!input.customer_email && !input.customer_phone) return;

  // A escrita é feita por uma função segura no servidor, que valida os dados
  // e identifica o carrinho pelo e-mail/telefone informado no checkout.
  const { error } = await supabase.rpc("upsert_abandoned_cart", {
    payload: {
      customer_name: input.customer_name ?? null,
      customer_email: input.customer_email ?? null,
      customer_phone: input.customer_phone ?? null,
      cart_data: input.cart_data ?? [],
      subtotal: input.subtotal ?? 0,
      shipping_cost: input.shipping_cost ?? 0,
      discount: input.discount ?? 0,
      total: input.total ?? 0,
    },
  });
  if (error) console.error("Error saving abandoned cart");
}

export async function loadAbandonedCarts(): Promise<AbandonedCart[]> {
  const { data, error } = await supabase
    .from("abandoned_carts")
    .select("*")
    .is("recovered_at", null)
    .is("order_id", null)
    .order("last_updated_at", { ascending: false });
    
  if (error) throw new Error(error.message);
  return (data || []) as AbandonedCart[];
}

export async function markAsRecovered(id: string) {
  const { error } = await supabase
    .from("abandoned_carts")
    .update({ recovered_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export function buildAbandonmentWhatsAppLink(cart: AbandonedCart) {
  const items = cart.cart_data.items || [];
  const itemsList = items.map((i: any) => `- ${i.quantity}x ${i.product.node.title}`).join("\n");
  
  const message = `Olá ${cart.customer_name || ""}! Notamos que você deixou alguns itens incríveis na sua sacola na Soraia Fernandes:\n\n${itemsList}\n\nAinda dá tempo de garantir as suas peças! Clique aqui para finalizar sua compra: https://www.soraiafernandes.com.br/checkout\n\nQualquer dúvida, estamos à disposição!`;
  
  const phone = (cart.customer_phone || "").replace(/\D/g, "");
  return `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
}
