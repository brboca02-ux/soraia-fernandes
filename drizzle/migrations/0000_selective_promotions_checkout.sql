CREATE TABLE public.promotions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK (length(trim(name)) > 0),
 active boolean NOT NULL DEFAULT false,
 mode text NOT NULL CHECK (mode IN ('percentage','fixed_price')),
 value numeric(10,2) NOT NULL CHECK (value > 0),
 product_ids uuid[] NOT NULL DEFAULT '{}',
 minimum_subtotal numeric(10,2) NOT NULL DEFAULT 0 CHECK (minimum_subtotal >= 0),
 starts_at timestamptz, ends_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT promotions_date_order CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at),
 CONSTRAINT promotions_percent_limit CHECK (mode <> 'percentage' OR value <= 100),
 CONSTRAINT promotions_products_required CHECK (cardinality(product_ids) > 0)
);
GRANT SELECT ON public.promotions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY promotions_public_active ON public.promotions FOR SELECT TO anon, authenticated USING (active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()));
CREATE POLICY promotions_admin_read ON public.promotions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY promotions_admin_insert ON public.promotions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY promotions_admin_update ON public.promotions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY promotions_admin_delete ON public.promotions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX promotions_active_dates_idx ON public.promotions (active, starts_at, ends_at);

CREATE OR REPLACE FUNCTION public.quote_promotions(p_items jsonb, p_coupon_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
 v_item jsonb; v_prod record; v_promo record; v_qty int; v_base numeric(10,2); v_subtotal numeric(10,2) := 0; v_discount numeric(10,2) := 0; v_candidate numeric(10,2); v_best numeric(10,2) := 0; v_name text; v_id uuid; v_coupon record; v_coupon_discount numeric(10,2) := 0; v_eligible numeric(10,2); v_coupon_eligible numeric(10,2) := 0; v_line jsonb := '[]'::jsonb; v_rows jsonb := '[]'::jsonb;
BEGIN
 IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN RAISE EXCEPTION 'invalid_cart'; END IF;
 FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
   IF (v_item->>'product_id') IS NULL OR (v_item->>'product_id') !~ '^[0-9a-fA-F-]{36}$' THEN RAISE EXCEPTION 'invalid_product'; END IF;
   v_qty := (v_item->>'quantity')::int;
   IF v_qty IS NULL OR v_qty < 1 OR v_qty > 20 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
   SELECT id, price, sale_price, status INTO v_prod FROM public.products WHERE id = (v_item->>'product_id')::uuid;
   IF NOT FOUND OR v_prod.status <> 'ativo' THEN RAISE EXCEPTION 'product_not_found'; END IF;
   v_base := coalesce(v_prod.sale_price, v_prod.price);
   v_subtotal := v_subtotal + v_base * v_qty;
   v_rows := v_rows || jsonb_build_array(jsonb_build_object('id',v_prod.id,'price',v_base,'quantity',v_qty));
 END LOOP;
 FOR v_promo IN SELECT * FROM public.promotions WHERE active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()) ORDER BY created_at, id LOOP
   v_eligible := 0; v_candidate := 0;
   FOR v_item IN SELECT * FROM jsonb_array_elements(v_rows) LOOP
     IF (v_item->>'id')::uuid = ANY(v_promo.product_ids) THEN
       v_base := (v_item->>'price')::numeric; v_qty := (v_item->>'quantity')::int;
       v_eligible := v_eligible + v_base * v_qty;
       IF v_promo.mode = 'percentage' THEN v_candidate := v_candidate + round(v_base * v_qty * v_promo.value / 100, 2);
       ELSE v_candidate := v_candidate + greatest(0, v_base - v_promo.value) * v_qty; END IF;
     END IF;
   END LOOP;
   IF v_eligible >= v_promo.minimum_subtotal AND v_candidate > v_best THEN v_best := v_candidate; v_id := v_promo.id; v_name := v_promo.name; END IF;
 END LOOP;
 IF coalesce(trim(p_coupon_code),'') <> '' THEN
   SELECT type, value INTO v_coupon FROM public.coupons WHERE upper(code) = upper(trim(p_coupon_code)) AND is_active AND (expires_at IS NULL OR expires_at > now()) AND (usage_limit IS NULL OR usage_count < usage_limit) LIMIT 1;
   IF FOUND THEN
     -- Cupons só se aplicam a produtos participantes de alguma promoção ativa.
     FOR v_item IN SELECT * FROM jsonb_array_elements(v_rows) LOOP
       IF EXISTS (SELECT 1 FROM public.promotions p WHERE p.active AND (p.starts_at IS NULL OR p.starts_at <= now()) AND (p.ends_at IS NULL OR p.ends_at > now()) AND (v_item->>'id')::uuid = ANY(p.product_ids)) THEN
         v_coupon_eligible := v_coupon_eligible + (v_item->>'price')::numeric * (v_item->>'quantity')::int;
       END IF;
     END LOOP;
     IF v_coupon.type = 'percentage' THEN v_coupon_discount := round(v_coupon_eligible * least(greatest(v_coupon.value,0),100) / 100,2);
     ELSE v_coupon_discount := least(v_coupon_eligible, greatest(v_coupon.value,0)); END IF;
   END IF;
 END IF;
 IF v_coupon_discount > v_best THEN v_discount := v_coupon_discount; v_name := 'Cupom ' || upper(trim(p_coupon_code)); v_id := NULL;
 ELSE v_discount := v_best; END IF;
 RETURN jsonb_build_object('subtotal',v_subtotal,'discount',least(v_discount,v_subtotal),'total',greatest(0,v_subtotal-v_discount),'promotion_id',v_id,'promotion_name',v_name,'coupon_applied',v_coupon_discount > v_best,'lines',v_rows);
END $$;
REVOKE ALL ON FUNCTION public.quote_promotions(jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quote_promotions(jsonb,text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.place_order_promoted(payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb; v_quote jsonb; v_items jsonb; v_code text; v_discount numeric(10,2); v_base numeric(10,2); v_order uuid;
BEGIN
 -- The existing order function owns inventory reservation, customer, address and line item writes.
 -- Never pass the coupon to it: the quote determines whether coupon or promotion wins.
 v_code := nullif(trim(coalesce(payload->>'coupon_code','')), '');
 v_result := public.place_order(payload || jsonb_build_object('coupon_code', null));
 v_order := (v_result->>'id')::uuid;
 SELECT jsonb_agg(jsonb_build_object('product_id', product_id, 'quantity', quantity)) INTO v_items FROM public.order_items WHERE order_id = v_order;
 v_quote := public.quote_promotions(v_items, v_code);
 SELECT subtotal INTO v_base FROM public.orders WHERE id = v_order FOR UPDATE;
 v_discount := least(v_base, (v_quote->>'discount')::numeric);
 UPDATE public.orders SET discount = v_discount, total = greatest(0,v_base-v_discount)+shipping_cost WHERE id = v_order;
 IF coalesce((v_quote->>'coupon_applied')::boolean,false) AND v_code IS NOT NULL THEN
   UPDATE public.coupons SET usage_count = usage_count + 1 WHERE upper(code) = upper(v_code) AND is_active AND (usage_limit IS NULL OR usage_count < usage_limit);
 END IF;
 RETURN (SELECT jsonb_build_object('id',id,'order_number',order_number,'total',total,'discount',discount) FROM public.orders WHERE id = v_order);
END $$;
REVOKE ALL ON FUNCTION public.place_order_promoted(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order_promoted(jsonb) TO anon, authenticated, service_role;