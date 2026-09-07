-- =====================================================================
-- Soraia Fernandes — Hardening de segurança (checkout, RLS, estoque)
-- Rodar no SQL Editor do Supabase (role: postgres)
-- Depende de: supabase_setup.sql + supabase_orders_setup.sql já aplicados
-- =====================================================================

-- 1) Revoga inserts diretos e remove policies permissivas ---------------
REVOKE INSERT ON public.customers   FROM anon, authenticated;
REVOKE INSERT ON public.addresses   FROM anon, authenticated;
REVOKE INSERT ON public.orders      FROM anon, authenticated;
REVOKE INSERT ON public.order_items FROM anon, authenticated;

DROP POLICY IF EXISTS "customers_insert_any"   ON public.customers;
DROP POLICY IF EXISTS "addresses_insert_any"   ON public.addresses;
DROP POLICY IF EXISTS "orders_insert_any"      ON public.orders;
DROP POLICY IF EXISTS "order_items_insert_any" ON public.order_items;

-- 2) place_order — única forma de criar pedido -------------------------
-- Payload esperado (jsonb):
-- {
--   "customer": { "name","email","phone","cpf" },
--   "user_id":  "<uuid ou null>",  -- validado contra auth.uid()
--   "address":  { "cep","street","number","complement","district","city","state" },
--   "items":    [ { "product_id":"<uuid>","variant_size","variant_color","quantity":<int> } ],
--   "shipping_method": "PAC",
--   "shipping_cost":   19.9,
--   "payment_method":  "pix"|"cartao"|"boleto",
--   "notes":           "opcional"
-- }
--
-- Retorna: { id, order_number, total, subtotal, shipping_cost }
--
-- Regras:
--  - unit_price SEMPRE lido de products (usa sale_price quando definido)
--  - subtotal/total recalculados server-side
--  - valida estoque: (stock - reserved_stock) >= quantity
--  - incrementa reserved_stock
--  - só grava user_id se auth.uid() estiver presente e bater com o payload
--  - shipping_cost aceita o valor do cliente (frete não fraudável — se for,
--    trocar por RPC de cotação server-side depois)
CREATE OR REPLACE FUNCTION public.place_order(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid           uuid := auth.uid();
  v_claim_user    uuid;
  v_customer_id   uuid;
  v_address_id    uuid := gen_random_uuid();
  v_order_id      uuid := gen_random_uuid();
  v_order_number  text := generate_order_number();
  v_subtotal      numeric(10,2) := 0;
  v_shipping      numeric(10,2);
  v_total         numeric(10,2);
  v_payment       payment_method;
  v_items         jsonb;
  v_item          jsonb;
  v_prod          record;
  v_qty           int;
  v_price         numeric(10,2);
  v_item_subtotal numeric(10,2);
  v_available     int;
  v_email         text;
  v_name          text;
BEGIN
  IF payload IS NULL THEN RAISE EXCEPTION 'payload_required'; END IF;

  v_email := lower(trim(payload->'customer'->>'email'));
  v_name  := trim(payload->'customer'->>'name');
  IF v_email IS NULL OR v_email = '' OR v_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;
  IF v_name IS NULL OR length(v_name) < 2 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;

  v_claim_user := NULLIF(payload->>'user_id','')::uuid;
  -- Só aceita user_id se conferir com sessão
  IF v_claim_user IS NOT NULL AND v_claim_user <> v_uid THEN
    v_claim_user := v_uid;
  END IF;
  IF v_claim_user IS NULL THEN v_claim_user := v_uid; END IF;

  v_shipping := COALESCE((payload->>'shipping_cost')::numeric, 0);
  IF v_shipping < 0 OR v_shipping > 500 THEN RAISE EXCEPTION 'invalid_shipping_cost'; END IF;

  v_payment := (payload->>'payment_method')::payment_method;

  v_items := payload->'items';
  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'empty_cart';
  END IF;
  IF jsonb_array_length(v_items) > 50 THEN RAISE EXCEPTION 'too_many_items'; END IF;

  -- customer (upsert por email quando logado; sempre novo quando guest)
  IF v_uid IS NOT NULL THEN
    SELECT id INTO v_customer_id
      FROM public.customers
     WHERE email = v_email
       AND (user_id = v_uid OR user_id IS NULL)
     ORDER BY user_id NULLS LAST
     LIMIT 1;
    IF v_customer_id IS NOT NULL THEN
      UPDATE public.customers
         SET name    = v_name,
             phone   = NULLIF(payload->'customer'->>'phone',''),
             cpf     = NULLIF(payload->'customer'->>'cpf',''),
             user_id = v_uid
       WHERE id = v_customer_id;
    END IF;
  END IF;

  IF v_customer_id IS NULL THEN
    v_customer_id := gen_random_uuid();
    INSERT INTO public.customers (id, user_id, name, email, phone, cpf)
    VALUES (
      v_customer_id, v_claim_user, v_name, v_email,
      NULLIF(payload->'customer'->>'phone',''),
      NULLIF(payload->'customer'->>'cpf','')
    );
  END IF;

  -- address
  INSERT INTO public.addresses (id, customer_id, cep, street, number, complement, district, city, state)
  VALUES (
    v_address_id, v_customer_id,
    regexp_replace(COALESCE(payload->'address'->>'cep',''),'\D','','g'),
    COALESCE(payload->'address'->>'street',''),
    COALESCE(payload->'address'->>'number',''),
    NULLIF(payload->'address'->>'complement',''),
    COALESCE(payload->'address'->>'district',''),
    COALESCE(payload->'address'->>'city',''),
    upper(COALESCE(payload->'address'->>'state',''))
  );

  -- cria order (sem items ainda; totais provisórios)
  INSERT INTO public.orders (id, order_number, customer_id, address_id, status,
                             subtotal, shipping_cost, discount, total,
                             payment_method, shipping_method, notes)
  VALUES (v_order_id, v_order_number, v_customer_id, v_address_id, 'aguardando_pagamento',
          0, v_shipping, 0, v_shipping,
          v_payment, NULLIF(payload->>'shipping_method',''), NULLIF(payload->>'notes',''));

  -- items
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::int, 0);
    IF v_qty <= 0 OR v_qty > 20 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;

    -- lookup produto (obriga id)
    SELECT p.id, p.name, p.price, p.sale_price, p.stock, p.reserved_stock, p.status, p.track_stock
      INTO v_prod
      FROM public.products p
     WHERE p.id = NULLIF(v_item->>'product_id','')::uuid
       AND p.status = 'ativo'
     FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'product_not_found'; END IF;

    -- estoque
    IF v_prod.track_stock THEN
      v_available := COALESCE(v_prod.stock,0) - COALESCE(v_prod.reserved_stock,0);
      IF v_available < v_qty THEN
        RAISE EXCEPTION 'insufficient_stock:%', v_prod.name;
      END IF;
      UPDATE public.products
         SET reserved_stock = COALESCE(reserved_stock,0) + v_qty
       WHERE id = v_prod.id;
    END IF;

    -- preço server-side: sale_price se > 0, senão price
    v_price := CASE WHEN v_prod.sale_price IS NOT NULL AND v_prod.sale_price > 0
                    THEN v_prod.sale_price ELSE v_prod.price END;
    v_item_subtotal := round(v_price * v_qty, 2);
    v_subtotal := v_subtotal + v_item_subtotal;

    INSERT INTO public.order_items (order_id, product_id, product_name,
                                    variant_size, variant_color,
                                    unit_price, quantity, subtotal)
    VALUES (v_order_id, v_prod.id, v_prod.name,
            NULLIF(v_item->>'variant_size',''),
            NULLIF(v_item->>'variant_color',''),
            v_price, v_qty, v_item_subtotal);
  END LOOP;

  v_total := round(v_subtotal + v_shipping, 2);
  UPDATE public.orders
     SET subtotal = v_subtotal,
         total    = v_total
   WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'id',            v_order_id,
    'order_number',  v_order_number,
    'total',         v_total,
    'subtotal',      v_subtotal,
    'shipping_cost', v_shipping
  );
END $$;

REVOKE ALL ON FUNCTION public.place_order(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb) TO anon, authenticated;

-- 3) get_order_total — helper server-side p/ MP validar valor -----------
CREATE OR REPLACE FUNCTION public.get_order_total(p_order_number text)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT total FROM public.orders WHERE order_number = p_order_number $$;
REVOKE ALL ON FUNCTION public.get_order_total(text) FROM PUBLIC;
-- só o service_role usa (via handlers), mas concedemos a authenticated também
-- para casos de retry manual no admin
GRANT EXECUTE ON FUNCTION public.get_order_total(text) TO authenticated, service_role;

-- 4) Trigger de estoque em orders --------------------------------------
CREATE OR REPLACE FUNCTION public.orders_apply_stock()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    -- confirmação de venda: reserva vira baixa efetiva
    IF NEW.status IN ('pago','separando','enviado','entregue')
       AND OLD.status = 'aguardando_pagamento' THEN
      FOR r IN SELECT product_id, quantity FROM public.order_items
                WHERE order_id = NEW.id AND product_id IS NOT NULL LOOP
        UPDATE public.products
           SET stock          = GREATEST(0, COALESCE(stock,0) - r.quantity),
               reserved_stock = GREATEST(0, COALESCE(reserved_stock,0) - r.quantity)
         WHERE id = r.product_id AND track_stock = true;
      END LOOP;
    END IF;
    -- cancelamento antes do pagamento: só devolve reserva
    IF NEW.status = 'cancelado' AND OLD.status = 'aguardando_pagamento' THEN
      FOR r IN SELECT product_id, quantity FROM public.order_items
                WHERE order_id = NEW.id AND product_id IS NOT NULL LOOP
        UPDATE public.products
           SET reserved_stock = GREATEST(0, COALESCE(reserved_stock,0) - r.quantity)
         WHERE id = r.product_id AND track_stock = true;
      END LOOP;
    END IF;
    -- cancelamento depois de pago: devolve ao estoque
    IF NEW.status = 'cancelado' AND OLD.status IN ('pago','separando','enviado') THEN
      FOR r IN SELECT product_id, quantity FROM public.order_items
                WHERE order_id = NEW.id AND product_id IS NOT NULL LOOP
        UPDATE public.products
           SET stock = COALESCE(stock,0) + r.quantity
         WHERE id = r.product_id AND track_stock = true;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_apply_stock ON public.orders;
CREATE TRIGGER trg_orders_apply_stock
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_apply_stock();

-- 5) Índices adicionais -------------------------------------------------
CREATE INDEX IF NOT EXISTS orders_status_created_idx
  ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS order_items_product_idx
  ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS stock_movements_created_idx
  ON public.stock_movements(created_at DESC);

-- 6) Fim ----------------------------------------------------------------
-- Para reverter em emergência:
--   GRANT INSERT ON <tabelas> TO anon, authenticated;
--   recriar policies *_insert_any WITH CHECK (true);
--   DROP FUNCTION place_order(jsonb);
