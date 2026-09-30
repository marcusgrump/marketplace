create extension if not exists unaccent with schema extensions;

-- 1) Produtos: remove o que a Shopee já guarda e o painel não usa
alter table public.products drop column source_url, drop column sales, drop column rating;

-- 2) Seções da vitrine automática (produtos vêm da Shopee em tempo real, nada é guardado)
create table public.sections (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 80),
  keyword text not null default '' check (char_length(keyword) <= 80),
  sort text not null default 'vendidos' check (sort in ('relevancia', 'vendidos', 'comissao', 'menor_preco')),
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.sections enable row level security;
create policy "Visitantes veem seções ativas" on public.sections
  for select to anon using (active);
create policy "Logados veem ativas e admins veem todas" on public.sections
  for select to authenticated using (active or (select private.is_admin()));
create policy "Admins inserem seções" on public.sections
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins editam seções" on public.sections
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins removem seções" on public.sections
  for delete to authenticated using ((select private.is_admin()));

-- 3) Cliques: um contador por dia e por origem, em vez de uma linha por clique
--    ref = 'p:<id do produto>' | 's:<id da seção>' | 'busca' (resultados da Shopee na busca)
create table public.click_daily (
  day date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  ref text not null check (ref ~ '^(p|s):[0-9a-f-]{36}$' or ref = 'busca'),
  clicks integer not null default 0,
  primary key (day, ref)
);
create index click_daily_ref_idx on public.click_daily (ref, day);
alter table public.click_daily enable row level security;
create policy "Admins leem cliques" on public.click_daily
  for select to authenticated using ((select private.is_admin()));

insert into public.click_daily (day, ref, clicks)
select (created_at at time zone 'America/Sao_Paulo')::date, 'p:' || product_id, count(*)
from public.clicks
group by 1, 2;

drop function public.click_stats(integer);
drop table public.clicks;

create or replace function private.bump_click(p_ref text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.click_daily (ref, clicks) values (p_ref, 1)
  on conflict (day, ref) do update set clicks = public.click_daily.clicks + 1;
$$;
revoke execute on function private.bump_click(text) from public;

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

  perform private.bump_click('p:' || v_id);
  return v_url;
end;
$$;

-- Clique em produto da vitrine automática ou da busca (só aceita seções existentes)
create or replace function public.register_ref_click(p_ref text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_ref = 'busca'
     or (p_ref ~ '^s:[0-9a-f-]{36}$'
         and exists (select 1 from public.sections where id = substring(p_ref from 3)::uuid and active)) then
    perform private.bump_click(p_ref);
  end if;
end;
$$;
revoke execute on function public.register_ref_click(text) from public;
grant execute on function public.register_ref_click(text) to anon, authenticated;

-- Apagar produto/seção apaga os contadores dele
create or replace function private.delete_click_counters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.click_daily
  where ref = (case when tg_table_name = 'products' then 'p:' else 's:' end) || old.id;
  return old;
end;
$$;
create trigger products_delete_clicks after delete on public.products
  for each row execute function private.delete_click_counters();
create trigger sections_delete_clicks after delete on public.sections
  for each row execute function private.delete_click_counters();

-- Resumo de cliques para o painel (RLS: só admin vê dados)
create or replace function public.click_stats(p_days integer default 30)
returns table (ref text, clicks bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.ref, sum(c.clicks)::bigint
  from public.click_daily c
  where c.day > (now() at time zone 'America/Sao_Paulo')::date - p_days
  group by c.ref;
$$;
revoke execute on function public.click_stats(integer) from public;
grant execute on function public.click_stats(integer) to authenticated;

create or replace function public.click_totals()
returns table (today bigint, week bigint, month bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with d as (select (now() at time zone 'America/Sao_Paulo')::date as today)
  select
    coalesce(sum(c.clicks) filter (where c.day = d.today), 0)::bigint,
    coalesce(sum(c.clicks) filter (where c.day > d.today - 7), 0)::bigint,
    coalesce(sum(c.clicks), 0)::bigint
  from d left join public.click_daily c on c.day > d.today - 30;
$$;
revoke execute on function public.click_totals() from public;
grant execute on function public.click_totals() to authenticated;

-- 4) Vitrine paginada com busca sem acento, filtros e total de resultados
create or replace function public.list_products(
  p_q text default null,
  p_category text default null,
  p_store text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid, slug text, title text, image_url text, price numeric, original_price numeric,
  store text, category text, featured boolean, total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.slug, p.title, p.image_url, p.price, p.original_price,
         p.store, p.category, p.featured, count(*) over ()
  from public.products p
  where p.active
    and (coalesce(p_q, '') = ''
         or extensions.unaccent(lower(p.title)) like '%' || extensions.unaccent(lower(p_q)) || '%')
    and (p_category is null or p.category = p_category)
    and (p_store is null or p.store = p_store)
  order by p.featured desc, p.created_at desc
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;
grant execute on function public.list_products(text, text, text, integer, integer) to anon, authenticated;

create or replace function public.product_categories()
returns table (category text, total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.category, count(*) from public.products p where p.active group by p.category order by p.category;
$$;
grant execute on function public.product_categories() to anon, authenticated;

-- 5) Credenciais da Shopee para o servidor do site (sem login), protegidas por um token secreto
insert into public.settings (key, value)
values ('server_token', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

create or replace function public.server_shopee_credentials(p_token text)
returns table (app_id text, secret text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select value from public.settings where key = 'shopee_app_id'),
    (select value from public.settings where key = 'shopee_secret')
  where exists (select 1 from public.settings where key = 'server_token' and value = p_token);
$$;
revoke execute on function public.server_shopee_credentials(text) from public;
grant execute on function public.server_shopee_credentials(text) to anon, authenticated;
