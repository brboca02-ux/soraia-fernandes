ALTER TABLE public.promotions ADD COLUMN usage_limit integer, ADD COLUMN usage_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.promotions ADD CONSTRAINT promotions_usage_limit_positive CHECK (usage_limit IS NULL OR usage_limit > 0), ADD CONSTRAINT promotions_usage_count_nonnegative CHECK (usage_count >= 0);
ALTER TABLE public.orders ADD COLUMN promotion_id uuid REFERENCES public.promotions(id) ON DELETE SET NULL, ADD COLUMN promotion_snapshot jsonb, ADD COLUMN promotion_counted boolean NOT NULL DEFAULT false;
CREATE INDEX orders_campaign_capacity_idx ON public.orders(promotion_id,status);
INSERT INTO public.promotions(name,active,mode,value,product_ids,usage_limit) SELECT 'Vestidos selecionados',true,'fixed_price',439.90,array_agg(id),10 FROM public.products WHERE promotion_eligible HAVING count(*) > 0;
COMMENT ON COLUMN public.products.promotion_eligible IS 'DEPRECATED: campaign membership is managed through promotions.product_ids';
CREATE OR REPLACE FUNCTION public.campaign_available(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.promotions p WHERE p.id=p_id AND p.active AND (p.starts_at IS NULL OR p.starts_at<=now()) AND (p.ends_at IS NULL OR p.ends_at>now()) AND (p.usage_limit IS NULL OR p.usage_count+(SELECT count(*) FROM public.orders o WHERE o.promotion_id=p.id AND o.status='aguardando_pagamento' AND NOT o.promotion_counted)<p.usage_limit)); $$;
REVOKE ALL ON FUNCTION public.campaign_available(uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.campaign_available(uuid) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.quote_promotions(p_items jsonb,p_coupon_code text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_item jsonb; v_prod record; v_promo record; v_qty int; v_base numeric; v_subtotal numeric:=0; v_discount numeric:=0; v_candidate numeric; v_name text; v_id uuid; v_coupon record; v_coupon_discount numeric:=0; v_eligible numeric; v_coupon_eligible numeric:=0; v_rows jsonb:='[]'; v_rule jsonb;
BEGIN
 IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 OR jsonb_array_length(p_items)>50 THEN RAISE EXCEPTION 'invalid_cart'; END IF;
 FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
 v_qty:=(v_item->>'quantity')::int; IF v_qty IS NULL OR v_qty<1 OR v_qty>20 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
 SELECT id,price,sale_price,status INTO v_prod FROM public.products WHERE id=(v_item->>'product_id')::uuid;
 IF NOT FOUND OR v_prod.status<>'ativo' THEN RAISE EXCEPTION 'product_not_found'; END IF;
 v_base:=coalesce(v_prod.sale_price,v_prod.price); v_subtotal:=v_subtotal+v_base*v_qty;
 v_rows:=v_rows||jsonb_build_array(jsonb_build_object('id',v_prod.id,'price',v_base,'quantity',v_qty)); END LOOP;
 FOR v_promo IN SELECT * FROM public.promotions WHERE public.campaign_available(id) ORDER BY created_at,id LOOP
 v_eligible:=0; v_candidate:=0;
 FOR v_item IN SELECT * FROM jsonb_array_elements(v_rows) LOOP
 IF (v_item->>'id')::uuid=ANY(v_promo.product_ids) THEN
 v_base:=(v_item->>'price')::numeric; v_qty:=(v_item->>'quantity')::int; v_eligible:=v_eligible+v_base*v_qty;
 IF v_promo.mode='percentage' THEN v_candidate:=v_candidate+round(v_base*v_qty*v_promo.value/100,2); ELSE v_candidate:=v_candidate+greatest(0,v_base-v_promo.value)*v_qty; END IF; END IF; END LOOP;
 IF v_eligible>=v_promo.minimum_subtotal AND v_candidate>v_discount THEN v_discount:=v_candidate; v_id:=v_promo.id; v_name:=v_promo.name; v_rule:=jsonb_build_object('mode',v_promo.mode,'value',v_promo.value,'usage_limit',v_promo.usage_limit,'usage_count',v_promo.usage_count,'minimum_subtotal',v_promo.minimum_subtotal,'starts_at',v_promo.starts_at,'ends_at',v_promo.ends_at); END IF; END LOOP;
 IF coalesce(trim(p_coupon_code),'')<>'' THEN
 SELECT type,value INTO v_coupon FROM public.coupons WHERE upper(code)=upper(trim(p_coupon_code)) AND is_active AND (expires_at IS NULL OR expires_at>now()) AND (usage_limit IS NULL OR usage_count<usage_limit) LIMIT 1;
 IF FOUND THEN
 FOR v_item IN SELECT * FROM jsonb_array_elements(v_rows) LOOP
 IF EXISTS(SELECT 1 FROM public.promotions p WHERE public.campaign_available(p.id) AND (v_item->>'id')::uuid=ANY(p.product_ids)) THEN v_coupon_eligible:=v_coupon_eligible+(v_item->>'price')::numeric*(v_item->>'quantity')::int; END IF; END LOOP;
 IF v_coupon.type='percentage' THEN v_coupon_discount:=round(v_coupon_eligible*least(greatest(v_coupon.value,0),100)/100,2); ELSE v_coupon_discount:=least(v_coupon_eligible,greatest(v_coupon.value,0)); END IF; END IF; END IF;
 IF v_coupon_discount>v_discount THEN v_discount:=v_coupon_discount; v_id:=NULL; v_name:='Cupom '||upper(trim(p_coupon_code)); v_rule:=NULL; END IF;
 RETURN jsonb_build_object('subtotal',v_subtotal,'discount',least(v_discount,v_subtotal),'total',greatest(0,v_subtotal-v_discount),'promotion_id',v_id,'promotion_name',v_name,'coupon_applied',v_name='Cupom '||upper(trim(coalesce(p_coupon_code,''))),'campaign_rule',v_rule,'lines',v_rows);
END $$;
CREATE OR REPLACE FUNCTION public.place_order_promoted(payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_result jsonb; v_quote jsonb; v_order uuid; v_code text;
BEGIN PERFORM pg_advisory_xact_lock(74399010); v_code:=nullif(trim(payload->>'coupon_code'),''); v_quote:=public.quote_promotions(payload->'items',v_code);
 v_result:=public.place_order(payload||jsonb_build_object('coupon_code',null)); v_order:=(v_result->>'id')::uuid;
 UPDATE public.orders SET discount=least(subtotal,(v_quote->>'discount')::numeric),total=greatest(0,subtotal-(v_quote->>'discount')::numeric)+shipping_cost,promotion_id=(v_quote->>'promotion_id')::uuid,promotion_snapshot=jsonb_build_object('name',v_quote->>'promotion_name','rule',v_quote->'campaign_rule') WHERE id=v_order;
 IF coalesce((v_quote->>'coupon_applied')::boolean,false) THEN UPDATE public.coupons SET usage_count=usage_count+1 WHERE upper(code)=upper(v_code); END IF;
 RETURN(SELECT jsonb_build_object('id',id,'order_number',order_number,'total',total,'discount',discount) FROM public.orders WHERE id=v_order); END $$;
CREATE OR REPLACE FUNCTION public.count_paid_campaign() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN IF NEW.promotion_id IS NOT NULL AND NOT OLD.promotion_counted AND NEW.status='pago' THEN PERFORM pg_advisory_xact_lock(74399010); UPDATE public.promotions SET usage_count=usage_count+1 WHERE id=NEW.promotion_id; NEW.promotion_counted:=true; END IF;
 IF OLD.promotion_counted THEN NEW.promotion_counted:=true; END IF; RETURN NEW; END $$;
CREATE TRIGGER count_paid_campaign BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.count_paid_campaign();
CREATE OR REPLACE FUNCTION public.campaign_admin_stats() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'reserved_count',(SELECT count(*) FROM public.orders o WHERE o.promotion_id=p.id AND o.status='aguardando_pagamento' AND NOT o.promotion_counted))) FROM public.promotions p),'[]'); END $$;
REVOKE ALL ON FUNCTION public.campaign_admin_stats() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.campaign_admin_stats() TO authenticated;
ALTER TABLE public.promotions DROP CONSTRAINT promotions_products_required;
ALTER TABLE public.promotions ADD CONSTRAINT promotions_active_products CHECK (NOT active OR cardinality(product_ids)>0);
CREATE OR REPLACE FUNCTION public.set_product_campaigns(p_product uuid,p_campaigns uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.products WHERE id=p_product) THEN RAISE EXCEPTION 'product_not_found'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_campaigns) c WHERE NOT EXISTS(SELECT 1 FROM public.promotions WHERE id=c)) THEN RAISE EXCEPTION 'campaign_not_found'; END IF;
 PERFORM pg_advisory_xact_lock(74399010);
 UPDATE public.promotions SET product_ids=CASE WHEN id=ANY(coalesce(p_campaigns,'{}')) THEN CASE WHEN p_product=ANY(product_ids) THEN product_ids ELSE array_append(product_ids,p_product) END ELSE array_remove(product_ids,p_product) END,active=CASE WHEN NOT(id=ANY(coalesce(p_campaigns,'{}'))) AND cardinality(array_remove(product_ids,p_product))=0 THEN false ELSE active END,updated_at=now() WHERE p_product=ANY(product_ids) OR id=ANY(coalesce(p_campaigns,'{}')); END $$;
REVOKE ALL ON FUNCTION public.set_product_campaigns(uuid,uuid[]) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.set_product_campaigns(uuid,uuid[]) TO authenticated;
CREATE OR REPLACE FUNCTION public.protect_campaign_counter() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF pg_trigger_depth()<2 THEN IF TG_OP='INSERT' THEN NEW.usage_count:=0; ELSE NEW.usage_count:=OLD.usage_count; END IF; END IF;
 IF NEW.usage_limit IS NOT NULL AND NEW.usage_limit < NEW.usage_count THEN RAISE EXCEPTION 'O limite não pode ser menor que os pedidos já pagos.'; END IF; RETURN NEW; END $$;
CREATE TRIGGER protect_campaign_counter BEFORE INSERT OR UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.protect_campaign_counter();