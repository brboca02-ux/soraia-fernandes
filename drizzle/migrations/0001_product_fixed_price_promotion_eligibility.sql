ALTER TABLE public.products ADD COLUMN promotion_eligible boolean NOT NULL DEFAULT false;
UPDATE public.products SET promotion_eligible = true WHERE price > 439.90;
COMMENT ON COLUMN public.products.promotion_eligible IS 'Admin-controlled eligibility for the automatic R$ 439.90 offer; new products are excluded by default.';

CREATE OR REPLACE FUNCTION public.quote_promotions(p_items jsonb, p_coupon_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
 v_item jsonb; v_prod record; v_promo record; v_qty int; v_base numeric(10,2); v_subtotal numeric(10,2) := 0; v_discount numeric(10,2) := 0; v_candidate numeric(10,2); v_best numeric(10,2) := 0; v_name text; v_id uuid; v_coupon record; v_coupon_discount numeric(10,2) := 0; v_eligible numeric(10,2); v_coupon_eligible numeric(10,2) := 0; v_rows jsonb := '[]'::jsonb;
BEGIN
 IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN RAISE EXCEPTION 'invalid_cart'; END IF;
 FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
   IF (v_item->>'product_id') IS NULL OR (v_item->>'product_id') !~ '^[0-9a-fA-F-]{36}$' THEN RAISE EXCEPTION 'invalid_product'; END IF;
   v_qty := (v_item->>'quantity')::int;
   IF v_qty IS NULL OR v_qty < 1 OR v_qty > 20 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
   SELECT id, price, sale_price, status, promotion_eligible INTO v_prod FROM public.products WHERE id = (v_item->>'product_id')::uuid;
   IF NOT FOUND OR v_prod.status <> 'ativo' THEN RAISE EXCEPTION 'product_not_found'; END IF;
   v_base := coalesce(v_prod.sale_price, v_prod.price);
   v_subtotal := v_subtotal + v_base * v_qty;
   v_rows := v_rows || jsonb_build_array(jsonb_build_object('id',v_prod.id,'price',v_base,'quantity',v_qty,'eligible',v_prod.promotion_eligible));
   -- Existing individual sale prices are respected. Only eligible full-price items over the threshold enter this offer.
   IF v_prod.promotion_eligible AND v_prod.sale_price IS NULL AND v_prod.price > 439.90 THEN
     v_candidate := (v_prod.price - 439.90) * v_qty;
     v_best := v_best + v_candidate;
   END IF;
 END LOOP;
 IF v_best > 0 THEN v_name := 'Promoção R$ 439,90'; END IF;
 -- Compare the automatic offer with other campaigns; never stack discounts.
 v_discount := v_best;
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
   IF v_eligible >= v_promo.minimum_subtotal AND v_candidate > v_discount THEN v_discount := v_candidate; v_id := v_promo.id; v_name := v_promo.name; END IF;
 END LOOP;
 IF coalesce(trim(p_coupon_code),'') <> '' THEN
   SELECT type, value INTO v_coupon FROM public.coupons WHERE upper(code) = upper(trim(p_coupon_code)) AND is_active AND (expires_at IS NULL OR expires_at > now()) AND (usage_limit IS NULL OR usage_count < usage_limit) LIMIT 1;
   IF FOUND THEN
     FOR v_item IN SELECT * FROM jsonb_array_elements(v_rows) LOOP
       IF (v_item->>'eligible')::boolean OR EXISTS (SELECT 1 FROM public.promotions p WHERE p.active AND (p.starts_at IS NULL OR p.starts_at <= now()) AND (p.ends_at IS NULL OR p.ends_at > now()) AND (v_item->>'id')::uuid = ANY(p.product_ids)) THEN
         v_coupon_eligible := v_coupon_eligible + (v_item->>'price')::numeric * (v_item->>'quantity')::int;
       END IF;
     END LOOP;
     IF v_coupon.type = 'percentage' THEN v_coupon_discount := round(v_coupon_eligible * least(greatest(v_coupon.value,0),100) / 100,2);
     ELSE v_coupon_discount := least(v_coupon_eligible, greatest(v_coupon.value,0)); END IF;
   END IF;
 END IF;
 IF v_coupon_discount > v_discount THEN v_discount := v_coupon_discount; v_name := 'Cupom ' || upper(trim(p_coupon_code)); v_id := NULL; END IF;
 RETURN jsonb_build_object('subtotal',v_subtotal,'discount',least(v_discount,v_subtotal),'total',greatest(0,v_subtotal-v_discount),'promotion_id',v_id,'promotion_name',v_name,'coupon_applied',v_coupon_discount > greatest(v_best,0) AND v_name = 'Cupom ' || upper(trim(coalesce(p_coupon_code,''))),'lines',v_rows);
END $$;
REVOKE ALL ON FUNCTION public.quote_promotions(jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quote_promotions(jsonb,text) TO anon, authenticated, service_role;