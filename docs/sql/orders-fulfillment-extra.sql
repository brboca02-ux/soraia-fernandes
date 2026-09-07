-- =====================================================================
-- Soraia Fernandes — Adiciona etapas `pronto_retirada` e `em_transito`
-- Rode no Supabase → SQL Editor. Idempotente.
-- =====================================================================

-- 1) Relaxa o CHECK antigo e recria com as novas etapas.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_fulfillment_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_fulfillment_status_check
  CHECK (
    fulfillment_status IS NULL OR fulfillment_status IN (
      'recebido',
      'embalado',
      'pronto_retirada',
      'coletado',
      'enviado',
      'em_transito',
      'entregue'
    )
  );

-- 2) Atualiza a RPC admin para aceitar as novas etapas.
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

  IF p_stage NOT IN (
    'recebido','embalado','pronto_retirada','coletado','enviado','em_transito','entregue'
  ) THEN
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
