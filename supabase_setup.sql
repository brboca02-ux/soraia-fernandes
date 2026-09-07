-- =====================================================================
-- Soraia Fernandes - Schema completo do e-commerce
-- Rode tudo de uma vez no SQL Editor do Supabase (projeto snqvhexeruvlyrtzsdnm)
-- =====================================================================

-- 1) Enums ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.product_status AS ENUM ('ativo', 'inativo', 'arquivado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.movement_type AS ENUM ('entrada', 'saida', 'ajuste');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Tabelas ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  image text DEFAULT '',
  sort_order int DEFAULT 99,
  status public.product_status NOT NULL DEFAULT 'ativo',
  show_home boolean DEFAULT true,
  show_menu boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  category_id text NOT NULL DEFAULT 'feminino',
  brand text DEFAULT 'Soraia Fernandes',
  sku text DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  sale_price numeric(10,2),
  stock int NOT NULL DEFAULT 0,
  reserved_stock int NOT NULL DEFAULT 0,
  minimum_stock int NOT NULL DEFAULT 5,
  track_stock boolean NOT NULL DEFAULT true,
  weight numeric(10,2) NOT NULL DEFAULT 0,
  status public.product_status NOT NULL DEFAULT 'ativo',
  meta_title text DEFAULT '',
  meta_description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);

CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  position int NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '',
  stock int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  type public.movement_type NOT NULL,
  quantity int NOT NULL,
  reason text DEFAULT '',
  notes text DEFAULT '',
  user_id uuid REFERENCES auth.users(id),
  user_name text DEFAULT 'Admin',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);

-- 3) GRANTS (OBRIGATÓRIO para o Data API enxergar) -------------------
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;

GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 4) Função has_role (security definer) -------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5) RLS --------------------------------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- user_roles: usuário vê os próprios papéis; admin gerencia tudo
DROP POLICY IF EXISTS "view own roles" ON public.user_roles;
CREATE POLICY "view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- categories: leitura pública dos ativos; escrita admin
DROP POLICY IF EXISTS "public read active categories" ON public.categories;
CREATE POLICY "public read active categories" ON public.categories FOR SELECT
  USING (status = 'ativo' OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins manage categories" ON public.categories;
CREATE POLICY "admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- products: leitura pública dos ativos; escrita admin
DROP POLICY IF EXISTS "public read active products" ON public.products;
CREATE POLICY "public read active products" ON public.products FOR SELECT
  USING (status = 'ativo' OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins manage products" ON public.products;
CREATE POLICY "admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- product_images / variants: leitura pública; escrita admin
DROP POLICY IF EXISTS "public read images" ON public.product_images;
CREATE POLICY "public read images" ON public.product_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "admins manage images" ON public.product_images;
CREATE POLICY "admins manage images" ON public.product_images FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "public read variants" ON public.product_variants;
CREATE POLICY "public read variants" ON public.product_variants FOR SELECT USING (true);
DROP POLICY IF EXISTS "admins manage variants" ON public.product_variants;
CREATE POLICY "admins manage variants" ON public.product_variants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- stock_movements: só admin
DROP POLICY IF EXISTS "admins read stock" ON public.stock_movements;
CREATE POLICY "admins read stock" ON public.stock_movements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins write stock" ON public.stock_movements;
CREATE POLICY "admins write stock" ON public.stock_movements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6) Trigger updated_at em products -----------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS products_set_updated_at ON public.products;
CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7) Seed de categorias -----------------------------------------------
INSERT INTO public.categories (slug, name, sort_order) VALUES
  ('feminino', 'Feminino', 1),
  ('masculino', 'Masculino', 2),
  ('vestidos', 'Vestidos', 3),
  ('conjuntos', 'Conjuntos', 4),
  ('plus-size', 'Plus Size', 5)
ON CONFLICT (slug) DO NOTHING;

-- 8) Seed de produtos (somente se a tabela estiver vazia) -------------
DO $seed$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.products;
  IF v_count = 0 THEN
    WITH seed(slug, name, description, category_id, brand, sku, price, stock, status, image_url) AS (
      VALUES
      ('bermuda-masc-verde', $$Bermuda Masc Verde$$, $$Bermuda Masc Verde — peça selecionada da curadoria Soraia Fernandes.$$, 'masculino', 'Soraia Fernandes', 'MD-BERMUDAMASCVERDE', 149.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/9c64939a-0b37-45da-a2e4-076c156bee9f/bermuda-masc-verde.jpg'),
      ('bermuda-moletom-masc', $$Bermuda Moletom Masc$$, $$Bermuda Moletom Masc — peça selecionada da curadoria Soraia Fernandes.$$, 'masculino', 'Soraia Fernandes', 'MD-BERMUDAMOLETOMMASC', 99.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/283a9b48-6b9a-4359-a626-e63e019e9ec8/bermuda-moletom-masc.jpg'),
      ('bermudas-moletom-cinza', $$Bermudas Moletom Cinza$$, $$Bermudas Moletom Cinza — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-BERMUDASMOLETOMCINZA', 189.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/798ad14c-3577-41dd-bbea-f12e075ac27c/bermudas-moletom-cinza.jpg'),
      ('blusa-linho-palmeira', $$Blusa Linho Palmeira$$, $$Blusa Linho Palmeira — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-BLUSALINHOPALMEIRA', 259.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/daefdb78-c65d-41b4-b9f3-75f0e2a1897b/blusa-linho-palmeira.jpg'),
      ('blusas-trico-canelado', $$Blusas Tricô Canelado$$, $$Blusas Tricô Canelado — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-BLUSASTRICOCANELADO', 149.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/40ce981b-ddd7-42ee-b4c0-c71636be56f5/blusas-trico-canelado.jpg'),
      ('cacharrel-gola-alta', $$Cacharrel Gola Alta$$, $$Cacharrel Gola Alta — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-CACHARRELGOLAALTA', 259.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/81d20f7f-7710-4394-84b9-799fd12f1440/cacharrel-gola-alta.jpg'),
      ('calca-alfaiataria-caramelo', $$Calça Alfaiataria Caramelo$$, $$Calça Alfaiataria Caramelo — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-CALCAALFAIATARIACARAMELO', 149.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/3d811835-dc83-4dcd-9414-b378febd5cb9/calca-alfaiataria-caramelo.jpg'),
      ('calca-cargo-marrom', $$Calça Cargo Marrom$$, $$Calça Cargo Marrom — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-CALCACARGOMARROM', 169.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/9776cd84-28ba-406b-b8fb-93fd5ee607f4/calca-cargo-marrom.jpg'),
      ('calca-jeans-cargo-grafite', $$Calça Jeans Cargo Grafite$$, $$Calça Jeans Cargo Grafite — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-CALCAJEANSCARGOGRAFITE', 209.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/5b1dfbd6-788f-4a7c-a32c-1946a2038b35/calca-jeans-cargo-grafite.jpg'),
      ('calca-jeans-mom-azul', $$Calça Jeans Mom Azul$$, $$Calça Jeans Mom Azul — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-CALCAJEANSMOMAZUL', 229.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/9e78d306-7d1d-479d-95e5-f36632c732fd/calca-jeans-mom-azul.jpg'),
      ('calca-preta', $$Calça Preta$$, $$Calça Preta — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-CALCAPRETA', 199.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/17e0e891-96b1-405e-bf34-f90b6dbde8fe/calca-preta.jpg'),
      ('calca-trico-listrada', $$Calça Tricô Listrada$$, $$Calça Tricô Listrada — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-CALCATRICOLISTRADA', 159.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/8d1f5175-d155-4f86-a3c7-5c02963139e0/calca-trico-listrada.jpg'),
      ('calcas-jeans-trio', $$Calças Jeans Trio$$, $$Calças Jeans Trio — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-CALCASJEANSTRIO', 99.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/e1891fc9-6134-492b-9614-62ea7638cff7/calcas-jeans-trio.jpg'),
      ('calcas-jogger-esportivas', $$Calças Jogger Esportivas$$, $$Calças Jogger Esportivas — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-CALCASJOGGERESPORTIVAS', 109.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/36e5ed97-6a58-4e6a-8986-7f5bda0e1116/calcas-jogger-esportivas.jpg'),
      ('calcas-moletom-jogger', $$Calças Moletom Jogger$$, $$Calças Moletom Jogger — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-CALCASMOLETOMJOGGER', 169.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/e729b0d5-eb5d-4e57-9654-8da2dcbe6085/calcas-moletom-jogger.jpg'),
      ('camisa-listrada-laco', $$Camisa Listrada Laco$$, $$Camisa Listrada Laco — peça selecionada da curadoria Soraia Fernandes.$$, 'masculino', 'Soraia Fernandes', 'MD-CAMISALISTRADALACO', 109.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/2ffd1405-9092-4d3c-a7c0-1e31f7c8aa13/camisa-listrada-laco.jpg'),
      ('camisa-richelieu-offwhite', $$Camisa Richelieu Offwhite$$, $$Camisa Richelieu Offwhite — peça selecionada da curadoria Soraia Fernandes.$$, 'masculino', 'Soraia Fernandes', 'MD-CAMISARICHELIEUOFFWHITE', 209.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/9c2d5fb9-4744-47c3-bfe3-2a247165b8ac/camisa-richelieu-offwhite.jpg'),
      ('camisetas-masc-basicas', $$Camisetas Masc Basicas$$, $$Camisetas Masc Basicas — peça selecionada da curadoria Soraia Fernandes.$$, 'masculino', 'Soraia Fernandes', 'MD-CAMISETASMASCBASICAS', 139.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/1d4d32fb-1433-4f19-8eae-f90d9f83d606/camisetas-masc-basicas.jpg'),
      ('conjunto-moletom-cinza', $$Conjunto Moletom Cinza$$, $$Conjunto Moletom Cinza — peça selecionada da curadoria Soraia Fernandes.$$, 'conjuntos', 'Soraia Fernandes', 'MD-CONJUNTOMOLETOMCINZA', 289.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/ec2ce521-b1ec-47fb-8de1-8100bd9fff16/conjunto-moletom-cinza.jpg'),
      ('conjunto-trico-caramelo', $$Conjunto Tricô Caramelo$$, $$Conjunto Tricô Caramelo — peça selecionada da curadoria Soraia Fernandes.$$, 'conjuntos', 'Soraia Fernandes', 'MD-CONJUNTOTRICOCARAMELO', 139.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/aff9963f-edde-41b4-a696-b886dea34d38/conjunto-trico-caramelo.jpg'),
      ('conjunto-trico-listrado-pb', $$Conjunto Tricô Listrado P&B$$, $$Conjunto Tricô Listrado P&B — peça selecionada da curadoria Soraia Fernandes.$$, 'conjuntos', 'Soraia Fernandes', 'MD-CONJUNTOTRICOLISTRADOPB', 139.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/16f51f5e-3307-474a-9e6d-72f3e2e8fdf1/conjunto-trico-listrado-pb.jpg'),
      ('conjunto-tricot-marrom', $$Conjunto Tricôt Marrom$$, $$Conjunto Tricôt Marrom — peça selecionada da curadoria Soraia Fernandes.$$, 'conjuntos', 'Soraia Fernandes', 'MD-CONJUNTOTRICOTMARROM', 109.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/2b657439-aa37-4a2b-9d51-291077492610/conjunto-tricot-marrom.jpg'),
      ('conjunto-tweed-bege', $$Conjunto Tweed Bege$$, $$Conjunto Tweed Bege — peça selecionada da curadoria Soraia Fernandes.$$, 'conjuntos', 'Soraia Fernandes', 'MD-CONJUNTOTWEEDBEGE', 129.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/1562a756-8f2e-429a-9fb2-a33eea1c06f3/conjunto-tweed-bege.jpg'),
      ('cropped-trico-caramelo', $$Cropped Tricô Caramelo$$, $$Cropped Tricô Caramelo — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-CROPPEDTRICOCARAMELO', 219.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/ab00ffdc-098c-4643-bc10-9ddf413ec410/cropped-trico-caramelo.jpg'),
      ('legging-tiedye-marrom', $$Legging Tiedye Marrom$$, $$Legging Tiedye Marrom — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-LEGGINGTIEDYEMARROM', 119.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/e8a0e862-7567-4eda-91a1-0e13444da7ea/legging-tiedye-marrom.jpg'),
      ('moletom-canguru-marrom', $$Moletom Canguru Marrom$$, $$Moletom Canguru Marrom — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-MOLETOMCANGURUMARROM', 189.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/9f76adc7-5150-4cf3-86b1-56b56bef87ed/moletom-canguru-marrom.jpg'),
      ('pantalona-lotus', $$Pantalona Lotus$$, $$Pantalona Lotus — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-PANTALONALOTUS', 259.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/dabcbe2e-0d4a-47fc-b989-be44bd309437/pantalona-lotus.jpg'),
      ('poncho-tricot', $$Poncho Tricôt$$, $$Poncho Tricôt — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-PONCHOTRICOT', 169.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/0519ff79-5be4-4790-ac64-af14fcd01207/poncho-tricot.jpg'),
      ('short-alfaiataria-marrom', $$Short Alfaiataria Marrom$$, $$Short Alfaiataria Marrom — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-SHORTALFAIATARIAMARROM', 209.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/983fcc47-05e2-4a1a-a068-7dae7cb87c6c/short-alfaiataria-marrom.jpg'),
      ('tshirt-cropped-grafite', $$T-shirt Cropped Grafite$$, $$T-shirt Cropped Grafite — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-TSHIRTCROPPEDGRAFITE', 179.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/9506c69e-be68-4974-aa50-0e341e087860/tshirt-cropped-grafite.jpg'),
      ('tshirt-lets-go-girls', $$T-shirt Lets Go Girls$$, $$T-shirt Lets Go Girls — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-TSHIRTLETSGOGIRLS', 99.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/27f806c0-91c2-4f50-af30-438535b09f1b/tshirt-lets-go-girls.jpg'),
      ('tshirt-wild-west', $$T-shirt Wild West$$, $$T-shirt Wild West — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-TSHIRTWILDWEST', 239.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/054f8b33-6283-4483-a443-814c52fe78ef/tshirt-wild-west.jpg'),
      ('tshirts-pretas-estampadas', $$T-shirts Pretas Estampadas$$, $$T-shirts Pretas Estampadas — peça selecionada da curadoria Soraia Fernandes.$$, 'feminino', 'Soraia Fernandes', 'MD-TSHIRTSPRETASESTAMPADAS', 279.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/d972c145-ca13-4f6f-8d89-6758bd0b0ee1/tshirts-pretas-estampadas.jpg'),
      ('vestido-jeans-bordado', $$Vestido Jeans Bordado$$, $$Vestido Jeans Bordado — peça selecionada da curadoria Soraia Fernandes.$$, 'vestidos', 'Soraia Fernandes', 'MD-VESTIDOJEANSBORDADO', 99.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/08264f30-538e-42ed-ab37-74e201842a9c/vestido-jeans-bordado.jpg'),
      ('vestido-linho-bege', $$Vestido Linho Bege$$, $$Vestido Linho Bege — peça selecionada da curadoria Soraia Fernandes.$$, 'vestidos', 'Soraia Fernandes', 'MD-VESTIDOLINHOBEGE', 179.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/3cb6d533-be2b-4da1-8c7d-0bcae361c96d/vestido-linho-bege.jpg'),
      ('vestido-midi-arabesco', $$Vestido Midi Arabesco$$, $$Vestido Midi Arabesco — peça selecionada da curadoria Soraia Fernandes.$$, 'vestidos', 'Soraia Fernandes', 'MD-VESTIDOMIDIARABESCO', 289.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/14a1106d-917c-47ea-b1f9-4b60f8899838/vestido-midi-arabesco.jpg'),
      ('vestidos-canelados-marrom', $$Vestidos Canelados Marrom$$, $$Vestidos Canelados Marrom — peça selecionada da curadoria Soraia Fernandes.$$, 'vestidos', 'Soraia Fernandes', 'MD-VESTIDOSCANELADOSMARROM', 269.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/c814cc94-9ade-4c59-aee7-d904d16573ec/vestidos-canelados-marrom.jpg'),
      ('vestidos-festa-longos', $$Vestidos Festa Longos$$, $$Vestidos Festa Longos — peça selecionada da curadoria Soraia Fernandes.$$, 'vestidos', 'Soraia Fernandes', 'MD-VESTIDOSFESTALONGOS', 259.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/4cf8852b-80f9-4673-99e4-5caaaa78de1a/vestidos-festa-longos.jpg'),
      ('vestidos-festa-renda', $$Vestidos Festa Renda$$, $$Vestidos Festa Renda — peça selecionada da curadoria Soraia Fernandes.$$, 'vestidos', 'Soraia Fernandes', 'MD-VESTIDOSFESTARENDA', 169.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/1270bf70-2bd6-4bb4-b7d6-5ed8de158257/vestidos-festa-renda.jpg'),
      ('vestidos-linho-trio', $$Vestidos Linho Trio$$, $$Vestidos Linho Trio — peça selecionada da curadoria Soraia Fernandes.$$, 'vestidos', 'Soraia Fernandes', 'MD-VESTIDOSLINHOTRIO', 279.90, 10, 'ativo'::product_status, '/__l5e/assets-v1/7642f966-af49-49b2-9e01-0fcf29c46c7c/vestidos-linho-trio.jpg')
    ),
    inserted AS (
      INSERT INTO public.products (slug, name, description, category_id, brand, sku, price, stock, status)
      SELECT slug, name, description, category_id, brand, sku, price, stock, status FROM seed
      RETURNING id, slug
    )
    INSERT INTO public.product_images (product_id, url, position, is_primary)
    SELECT i.id, s.image_url, 0, true
    FROM inserted i JOIN seed s ON s.slug = i.slug;
  END IF;
END $seed$;

-- =====================================================================
-- DEPOIS DE LOGAR COMO adm@adm, rode este bloco UMA ÚNICA VEZ
-- para se tornar admin:
--
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'admin' FROM auth.users WHERE email = 'adm@adm'
--   ON CONFLICT DO NOTHING;
--
-- =====================================================================


-- =====================================================================
-- 9) Storage bucket público para imagens enviadas pelo painel
--    (Se der erro de permissão, crie pelo Dashboard → Storage → New bucket
--     com nome "product-images" e public = true)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policies do bucket: leitura pública, escrita só admin
DROP POLICY IF EXISTS "public read product images" ON storage.objects;
CREATE POLICY "public read product images" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "admins upload product images" ON storage.objects;
CREATE POLICY "admins upload product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins delete product images" ON storage.objects;
CREATE POLICY "admins delete product images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
