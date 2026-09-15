import { supabase } from "@/integrations/supabase/client";

export type FulfillmentStage =
  | "recebido"
  | "embalado"
  | "pronto_retirada"
  | "coletado"
  | "enviado"
  | "em_transito"
  | "entregue";

/** Fluxo linear canônico exibido ao cliente (unificado retirada + entrega). */
export const FULFILLMENT_FLOW: FulfillmentStage[] = [
  "recebido",
  "embalado",
  "pronto_retirada",
  "em_transito",
  "entregue",
];

export const FULFILLMENT_LABEL: Record<FulfillmentStage, string> = {
  recebido: "Recebido",
  embalado: "Embalado",
  pronto_retirada: "Pronto p/ retirada",
  coletado: "Coletado",
  enviado: "Enviado",
  em_transito: "Em trânsito",
  entregue: "Entregue",
};

/** Descrição amigável para exibir na timeline pública. */
export const FULFILLMENT_DESCRIPTION: Record<FulfillmentStage, string> = {
  recebido: "Recebemos seu pedido e a produção foi iniciada.",
  embalado: "Seu pedido foi conferido e embalado com carinho.",
  pronto_retirada: "Está pronto para retirar na loja. Leve um documento com foto.",
  coletado: "Coletado pela transportadora.",
  enviado: "Postado nos Correios/transportadora.",
  em_transito: "A caminho do endereço de entrega.",
  entregue: "Pedido entregue. Obrigada pela preferência! 💛",
};

export interface FulfillmentHistoryEntry {
  stage: FulfillmentStage;
  from: FulfillmentStage | null;
  at: string;
  by: string;
}

export interface PublicOrder {
  id: string;
  order_number: string;
  status: string;
  fulfillment_status: FulfillmentStage | null;
  fulfillment_history: FulfillmentHistoryEntry[];
  subtotal: number;
  shipping_cost: number;
  shipping_method: string | null;
  discount: number;
  total: number;
  payment_method: string | null;
  payment_url: string | null;
  tracking_code: string | null;
  created_at: string;
  paid_at: string | null;
  address: {
    cep: string;
    street: string;
    number: string;
    complement: string | null;
    district: string;
    city: string;
    state: string;
  } | null;
  items: {
    id: string;
    product_name: string;
    variant_size: string | null;
    variant_color: string | null;
    unit_price: number;
    quantity: number;
    subtotal: number;
  }[];
}

/** Busca pública por número + e-mail (RPC SECURITY DEFINER). */
export async function getOrderPublic(
  orderNumber: string,
  email: string,
): Promise<PublicOrder | null> {
  const { data, error } = await supabase.rpc("get_order_public", {
    p_order_number: orderNumber,
    p_email: email,
  });
  if (error) throw error;
  return (data as unknown as PublicOrder | null) ?? null;
}

/** Admin: seta a etapa de fulfillment e grava histórico. */
export async function setOrderFulfillment(
  orderId: string,
  stage: FulfillmentStage,
): Promise<void> {
  const { error } = await supabase.rpc("set_order_fulfillment", {
    p_order_id: orderId,
    p_stage: stage,
  });
  if (error) throw error;
}
