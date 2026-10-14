CREATE OR REPLACE FUNCTION public.set_product_in_campaign(p_campaign uuid, p_product uuid, p_participate boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 PERFORM pg_advisory_xact_lock(74399010);
 UPDATE public.promotions SET product_ids = CASE WHEN p_participate THEN
   CASE WHEN p_product = ANY(product_ids) THEN product_ids ELSE array_append(product_ids,p_product) END
   ELSE array_remove(product_ids,p_product) END, updated_at=now()
 WHERE id=p_campaign;
 IF NOT FOUND THEN RAISE EXCEPTION 'campaign_not_found'; END IF;
 UPDATE public.products SET promotion_eligible=p_participate WHERE id=p_product;
END $$;
REVOKE ALL ON FUNCTION public.set_product_in_campaign(uuid,uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_product_in_campaign(uuid,uuid,boolean) TO authenticated, service_role;