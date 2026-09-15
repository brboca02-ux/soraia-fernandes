-- =====================================================================
-- Soraia Fernandes — Rastreio público + etapas de fulfillment
-- Rode no Supabase → SQL Editor. Idempotente.
-- =====================================================================

-- 1) Coluna de etapas de envio (independente do status de pagamento)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_status text
    CHECK (fulfillment_status IS NULL OR fulfillment_status IN
      ('recebido','embalado','coletado','enviado','entregue'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) RPC pública: consulta segura por número + e-mail
--    Retorna apenas campos necessários para a tela de acompanhamento.
CREATE OR REPLACE FUNCTION public.get_order_public(
  p_order_number text,
  p_email text
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'fulfillment_status', o.fulfillment_status,
    'fulfillment_history', o.fulfillment_history,
    'subtotal', o.subtotal,
    'shipping_cost', o.shipping_cost,
    'shipping_method', o.shipping_method,
    'discount', o.discount,
    'total', o.total,
    'payment_method', o.payment_method,
    'payment_url', o.payment_url,
    'tracking_code', o.tracking_code,
    'created_at', o.created_at,
    'paid_at', o.paid_at,
    'address', to_jsonb(a.*) - 'id' - 'customer_id' - 'created_at',
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id,
        'product_name', i.product_name,
        'variant_size', i.variant_size,
        'variant_color', i.variant_color,
        'unit_price', i.unit_price,
        'quantity', i.quantity,
        'subtotal', i.subtotal
      ) ORDER BY i.id)
      FROM public.order_items i WHERE i.order_id = o.id
    ), '[]'::jsonb)
  )
  FROM public.orders o
  JOIN public.customers c ON c.id = o.customer_id
  LEFT JOIN public.addresses a ON a.id = o.address_id
  WHERE o.order_number = p_order_number
    AND lower(c.email) = lower(p_email)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_order_public(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_public(text,text) TO anon, authenticated;

-- 3) RPC admin: avança etapa de fulfillment e loga no histórico
CREATE OR REPLACE FUNCTION public.set_order_fulfillment(
  p_order_id uuid,
  p_stage text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  IF p_stage NOT IN ('recebido','embalado','coletado','enviado','entregue') THEN
    RAISE EXCEPTION 'invalid stage: %', p_stage;
  END IF;

  SELECT fulfillment_status INTO v_prev FROM public.orders WHERE id = p_order_id;

  UPDATE public.orders
     SET fulfillment_status = p_stage,
         fulfillment_history = fulfillment_history || jsonb_build_object(
           'stage', p_stage,
           'from', v_prev,
           'at', now(),
           'by', v_uid
         )
   WHERE id = p_order_id;

  RETURN jsonb_build_object('ok', true, 'stage', p_stage);
END;
$$;

REVOKE ALL ON FUNCTION public.set_order_fulfillment(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_order_fulfillment(uuid,text) TO authenticated;

-- 4) Habilite Realtime (Database → Replication → supabase_realtime)
--    adicionando a tabela public.orders para que o cliente e o admin
--    recebam atualizações automáticas via websocket.
