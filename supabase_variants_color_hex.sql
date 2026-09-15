-- Adiciona coluna color_hex a product_variants para armazenar a cor hex
-- detectada pela IA. Rode uma vez no SQL Editor do Supabase.

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS color_hex text;

COMMENT ON COLUMN public.product_variants.color_hex IS
  'Hex color (#rrggbb) detectado pela IA a partir da foto do produto. Opcional.';
