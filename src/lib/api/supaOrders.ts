import { supabase } from "@/integrations/supabase/client";
import type { PaymentMethod } from "@/lib/integrations/payment";

export interface NewOrderInput {
  customer: {
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
    user_id?: string | null;
  };
  address: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
  };
  items: {
    product_id: string | null;
    product_name?: string;
    variant_size?: string;
    variant_color?: string;
    unit_price?: number; // ignorado no servidor
    quantity: number;
  }[];
  subtotal?: number; // ignorado no servidor
  shipping_cost: number;
  shipping_method: string;
  discount?: number; // ignorado no servidor
  total?: number; // ignorado no servidor
  payment_method: PaymentMethod;
  notes?: string;
  /** Código do cupom: validado e contabilizado no servidor. */
  coupon_code?: string;
}

export interface CreatedOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
}

/**
 * Cria um pedido via RPC `place_order` (SECURITY DEFINER).
 * O servidor recalcula preços/subtotal/total a partir de `products` e
 * valida estoque — nada do que vem do cliente sobre preço é confiado.
 */
export async function createOrder(input: NewOrderInput): Promise<CreatedOrder> {
  const payload = {
    user_id: input.customer.user_id ?? null,
    customer: {
      name: input.customer.name,
      email: input.customer.email.toLowerCase(),
      phone: input.customer.phone ?? null,
      cpf: input.customer.cpf ?? null,
    },
    address: {
      cep: input.address.cep.replace(/\D/g, ""),
      street: input.address.street,
      number: input.address.number,
      complement: input.address.complement ?? null,
      district: input.address.district,
      city: input.address.city,
      state: input.address.state,
    },
    items: input.items
      .filter((i) => i.product_id) // sem product_id não dá pra validar server-side
      .map((i) => ({
        product_id: i.product_id,
        variant_size: i.variant_size ?? null,
        variant_color: i.variant_color ?? null,
        quantity: i.quantity,
      })),
    shipping_method: input.shipping_method,
    shipping_cost: input.shipping_cost,
    payment_method: input.payment_method,
    notes: input.notes ?? null,
    coupon_code: input.coupon_code ?? null,
  };

  if (payload.items.length === 0) {
    throw new Error("Nenhum item do carrinho tem product_id válido. Reabra a loja e adicione os produtos novamente.");
  }

  const { data, error } = await supabase.rpc("place_order", { payload });
  if (error) {
    // Traduz erros conhecidos
    const msg = error.message ?? "";
    if (msg.includes("insufficient_stock"))
      throw new Error("Estoque insuficiente para um dos itens.");
    if (msg.includes("product_not_found"))
      throw new Error("Um dos produtos não está mais disponível.");
    if (msg.includes("empty_cart")) throw new Error("Carrinho vazio.");
    if (msg.includes("invalid_email")) throw new Error("E-mail inválido.");
    throw new Error(msg || "Falha ao criar pedido.");
  }
  const result = data as { id: string; order_number: string; total: number };
  return {
    id: result.id,
    order_number: result.order_number,
    total: Number(result.total),
    status: "aguardando_pagamento",
  };
}

export interface OrderFull {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  payment_method: string | null;
  payment_provider: string | null;
  payment_url: string | null;
  shipping_method: string | null;
  tracking_code: string | null;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  customer: { id: string; name: string; email: string; phone: string | null; cpf: string | null };
  address: { cep: string; street: string; number: string; complement: string | null; district: string; city: string; state: string } | null;
  items: { id: string; product_name: string; variant_size: string | null; variant_color: string | null; unit_price: number; quantity: number; subtotal: number }[];
}

const FULL_SELECT = `
  id, order_number, status, subtotal, shipping_cost, discount, total,
  payment_method, payment_provider, payment_url, shipping_method, tracking_code,
  notes, created_at, paid_at,
  customer:customers(id, name, email, phone, cpf),
  address:addresses(cep, street, number, complement, district, city, state),
  items:order_items(id, product_name, variant_size, variant_color, unit_price, quantity, subtotal)
`;

export async function getOrderByNumber(orderNumber: string): Promise<OrderFull | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(FULL_SELECT)
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as OrderFull | null;
}

export async function listMyOrders(): Promise<OrderFull[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(FULL_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as OrderFull[];
}
