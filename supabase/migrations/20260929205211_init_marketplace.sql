create schema if not exists private;
grant usage on schema private to authenticated;

-- Administradores do painel
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

create policy "Admins leem a própria linha" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- Produtos
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 200),
  image_url text,
  price numeric(12, 2) not null check (price >= 0),
  original_price numeric(12, 2) check (original_price >= 0),
  store text not null default 'shopee'
    check (store in ('shopee', 'mercadolivre', 'amazon', 'aliexpress', 'magalu')),
  category text not null default 'Outros',
  affiliate_url text not null check (affiliate_url ~* '^https?://'),
  source_url text,
  shopee_shop_id bigint,
  shopee_item_id bigint,
  commission_rate numeric(6, 4) check (commission_rate between 0 and 1),
  sales integer,
  rating numeric(3, 2),
  featured boolean not null default false,
  active boolean not null default true,
  price_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index products_shopee_item_id_key on public.products (shopee_item_id) where shopee_item_id is not null;
create index products_listing_idx on public.products (active, featured desc, created_at desc);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger products_touch_updated_at before update on public.products
  for each row execute function private.touch_updated_at();

alter table public.products enable row level security;
create policy "Produtos ativos são públicos" on public.products
  for select to anon, authenticated using (active or (select private.is_admin()));
create policy "Admins inserem produtos" on public.products
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins editam produtos" on public.products
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins removem produtos" on public.products
  for delete to authenticated using ((select private.is_admin()));

-- Cliques nos links de afiliado
create table public.clicks (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index clicks_product_created_idx on public.clicks (product_id, created_at);
create index clicks_created_idx on public.clicks (created_at);
alter table public.clicks enable row level security;
create policy "Admins leem cliques" on public.clicks
  for select to authenticated using ((select private.is_admin()));

-- Registra o clique e devolve o link de afiliado (única forma de o público gravar em clicks)
create or replace function public.register_click(p_slug text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_url text;
begin
  select id, affiliate_url into v_id, v_url
  from public.products
  where slug = p_slug and active;

  if v_id is null then
    return null;
  end if;

  insert into public.clicks (product_id) values (v_id);
  return v_url;
end;
$$;
revoke execute on function public.register_click(text) from public;
grant execute on function public.register_click(text) to anon, authenticated;

-- Cliques por produto no período (respeita RLS: só admin vê)
create or replace function public.click_stats(p_days integer default 30)
returns table (product_id uuid, clicks bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.product_id, count(*) as clicks
  from public.clicks c
  where c.created_at > now() - make_interval(days => p_days)
  group by c.product_id;
$$;
revoke execute on function public.click_stats(integer) from public;
grant execute on function public.click_stats(integer) to authenticated;

-- Configurações (credenciais da Shopee etc.): só admin
create table public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;
create policy "Admins gerenciam configurações" on public.settings
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
