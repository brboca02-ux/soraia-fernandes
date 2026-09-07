-- Seed: 2 camisas femininas (Listrada Laço + Richelieu Offwhite)
-- Rode no SQL Editor do Supabase logado como owner do projeto.

insert into public.products
  (slug, name, description, category_id, brand, sku, price, sale_price,
   stock, reserved_stock, minimum_stock, track_stock, weight, status,
   meta_title, meta_description)
values
  ('camisa-listrada-laco',
   'Camisa Listrada Laço',
   'Camisa feminina listrada com laço na gola, manga longa. Elegante e versátil para o dia a dia ou looks de trabalho.',
   'feminino', 'Soraia Fernandes', 'CAM-LIST-LACO',
   189.90, null, 8, 0, 3, true, 0.35, 'ativo',
   'Camisa Listrada Laço — Soraia Fernandes',
   'Camisa feminina listrada com laço na gola. Compre na Soraia Fernandes.'),
  ('camisa-richelieu-offwhite',
   'Camisa Richelieu Offwhite',
   'Camisa feminina em tecido leve offwhite com bordado richelieu no busto e ombros. Sofisticada e romântica.',
   'feminino', 'Soraia Fernandes', 'CAM-RICH-OFF',
   229.90, null, 6, 0, 3, true, 0.30, 'ativo',
   'Camisa Richelieu Offwhite — Soraia Fernandes',
   'Camisa feminina bordada richelieu offwhite. Compre na Soraia Fernandes.')
on conflict (slug) do nothing;

-- Imagens (usa assets já existentes no projeto)
insert into public.product_images (product_id, url, position, is_primary)
select p.id,
       '/__l5e/assets-v1/2ffd1405-9092-4d3c-a7c0-1e31f7c8aa13/camisa-listrada-laco.jpg',
       0, true
from public.products p where p.slug = 'camisa-listrada-laco'
on conflict do nothing;

insert into public.product_images (product_id, url, position, is_primary)
select p.id,
       '/__l5e/assets-v1/9c2d5fb9-4744-47c3-bfe3-2a247165b8ac/camisa-richelieu-offwhite.jpg',
       0, true
from public.products p where p.slug = 'camisa-richelieu-offwhite'
on conflict do nothing;

-- Variantes (tamanhos P/M/G/GG, cor única)
insert into public.product_variants (product_id, size, color, color_hex, stock)
select p.id, s.size, 'Verde Militar', '#3d4a2a', 2
from public.products p
cross join (values ('P'),('M'),('G'),('GG')) as s(size)
where p.slug = 'camisa-listrada-laco'
on conflict do nothing;

insert into public.product_variants (product_id, size, color, color_hex, stock)
select p.id, s.size, 'Offwhite', '#f2ece0', 2 -- 2 por tamanho
from public.products p
cross join (values ('P'),('M'),('G')) as s(size)
where p.slug = 'camisa-richelieu-offwhite'
on conflict do nothing;
