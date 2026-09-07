-- =====================================================================
-- Soraia Fernandes — Produto de teste R$ 1,00 para validar fluxo de compra
-- Rode no Supabase → SQL Editor. Idempotente (pode rodar várias vezes).
-- Depois de criado, acesse: /produto/teste-checkout-1-real
-- =====================================================================

INSERT INTO public.products (
  slug, name, description, category_id, brand, sku,
  price, sale_price, stock, minimum_stock, track_stock,
  weight, status, meta_title, meta_description
) VALUES (
  'teste-checkout-1-real',
  '[TESTE] Validação de Checkout — R$ 1,00',
  'Produto de teste usado apenas para validar o fluxo completo de compra (checkout, Mercado Pago, webhook, etapas de envio e retirada). Valor simbólico de R$ 1,00. **Não é um produto real à venda.**',
  'feminino',
  'Soraia Fernandes',
  'TESTE-1REAL',
  1.00,
  NULL,
  999,
  0,
  false,
  0.10,
  'ativo',
  'Teste de checkout — Soraia Fernandes',
  'Produto interno de validação do fluxo de compra.'
)
ON CONFLICT (slug) DO UPDATE SET
  price = EXCLUDED.price,
  sale_price = NULL,
  stock = 999,
  track_stock = false,
  status = 'ativo',
  updated_at = now();

-- Imagem placeholder (só se ainda não existir alguma para esse produto)
INSERT INTO public.product_images (product_id, url, position, is_primary)
SELECT p.id,
       'https://placehold.co/800x1000/22c55e/ffffff/png?text=TESTE+R%241%2C00',
       0, true
FROM public.products p
WHERE p.slug = 'teste-checkout-1-real'
  AND NOT EXISTS (
    SELECT 1 FROM public.product_images i WHERE i.product_id = p.id
  );

-- Variante única (Tamanho Único / Cor Única) se ainda não houver
INSERT INTO public.product_variants (product_id, size, color, stock)
SELECT p.id, 'Único', 'Único', 999
FROM public.products p
WHERE p.slug = 'teste-checkout-1-real'
  AND NOT EXISTS (
    SELECT 1 FROM public.product_variants v WHERE v.product_id = p.id
  );
