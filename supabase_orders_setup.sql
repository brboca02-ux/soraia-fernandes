-- =============================================================
-- Soraia Fernandes — Setup de Pedidos / Checkout
-- Rode tudo no SQL Editor do Supabase (role: postgres)
-- Pré-requisitos: tabelas `products`, `user_roles`, função `has_role` já existem
-- =============================================================

-- 1) Enum de status -------------------------------------------
do $$ begin
  create type public.order_status as enum (
    'aguardando_pagamento','pago','separando','enviado','entregue','cancelado'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('pix','cartao','boleto');
exception when duplicate_object then null; end $$;

-- 2) Customers ------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  cpf text,
  created_at timestamptz not null default now()
);
create index if not exists customers_user_id_idx on public.customers(user_id);
create index if not exists customers_email_idx on public.customers(lower(email));

-- 3) Addresses ------------------------------------------------
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  cep text not null,
  street text not null,
  number text not null,
  complement text,
  district text not null,
  city text not null,
  state text not null,
  created_at timestamptz not null default now()
);
create index if not exists addresses_customer_idx on public.addresses(customer_id);

-- 4) Order number sequence -----------------------------------
create sequence if not exists public.order_number_seq start 1000;

create or replace function public.generate_order_number()
returns text language sql as $$
  select 'MD-' || to_char(now(),'YYYY') || '-' ||
         lpad(nextval('public.order_number_seq')::text, 5, '0')
$$;

-- 5) Orders ---------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default public.generate_order_number(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  address_id  uuid references public.addresses(id) on delete set null,
  status public.order_status not null default 'aguardando_pagamento',
  subtotal numeric(10,2) not null default 0,
  shipping_cost numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_method public.payment_method,
  payment_provider text,
  payment_id text,
  payment_url text,
  shipping_method text,
  tracking_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists orders_customer_idx on public.orders(customer_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_idx on public.orders(created_at desc);

-- 6) Order items ----------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  variant_size text,
  variant_color text,
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  subtotal numeric(10,2) not null
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- 7) GRANTS (PostgREST não concede por padrão) ----------------
grant select, insert, update on public.customers   to authenticated;
grant select, insert, update on public.addresses   to authenticated;
grant select, insert, update on public.orders      to authenticated;
grant select, insert, update on public.order_items to authenticated;
grant all on public.customers, public.addresses, public.orders, public.order_items to service_role;

-- checkout convidado (sem login): precisa inserir customer/order
grant insert on public.customers   to anon;
grant insert on public.addresses   to anon;
grant insert on public.orders      to anon;
grant insert on public.order_items to anon;
grant usage  on sequence public.order_number_seq to anon, authenticated;

-- 8) RLS ------------------------------------------------------
alter table public.customers   enable row level security;
alter table public.addresses   enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- helpers
do $$ begin
  -- customers: dono lê/atualiza; admin tudo; anon pode inserir (checkout convidado)
  drop policy if exists "customers_select_self_or_admin" on public.customers;
  create policy "customers_select_self_or_admin" on public.customers
    for select to authenticated
    using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

  drop policy if exists "customers_insert_any" on public.customers;
  create policy "customers_insert_any" on public.customers
    for insert to anon, authenticated
    with check (true);

  drop policy if exists "customers_update_self_or_admin" on public.customers;
  create policy "customers_update_self_or_admin" on public.customers
    for update to authenticated
    using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

  -- addresses
  drop policy if exists "addresses_select" on public.addresses;
  create policy "addresses_select" on public.addresses
    for select to authenticated
    using (
      public.has_role(auth.uid(),'admin')
      or exists (select 1 from public.customers c where c.id = addresses.customer_id and c.user_id = auth.uid())
    );

  drop policy if exists "addresses_insert_any" on public.addresses;
  create policy "addresses_insert_any" on public.addresses
    for insert to anon, authenticated with check (true);

  -- orders
  drop policy if exists "orders_select" on public.orders;
  create policy "orders_select" on public.orders
    for select to authenticated
    using (
      public.has_role(auth.uid(),'admin')
      or exists (select 1 from public.customers c where c.id = orders.customer_id and c.user_id = auth.uid())
    );

  drop policy if exists "orders_insert_any" on public.orders;
  create policy "orders_insert_any" on public.orders
    for insert to anon, authenticated with check (true);

  drop policy if exists "orders_update_admin" on public.orders;
  create policy "orders_update_admin" on public.orders
    for update to authenticated
    using (public.has_role(auth.uid(),'admin'));

  -- order_items
  drop policy if exists "order_items_select" on public.order_items;
  create policy "order_items_select" on public.order_items
    for select to authenticated
    using (
      public.has_role(auth.uid(),'admin')
      or exists (
        select 1 from public.orders o
        join public.customers c on c.id = o.customer_id
        where o.id = order_items.order_id and c.user_id = auth.uid()
      )
    );

  drop policy if exists "order_items_insert_any" on public.order_items;
  create policy "order_items_insert_any" on public.order_items
    for insert to anon, authenticated with check (true);
end $$;

-- 9) Touch updated_at -----------------------------------------
create or replace function public.touch_orders_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.touch_orders_updated_at();
