-- Cliques por origem, opcionalmente só das origens pedidas (evita o limite de 1000 linhas da API)
drop function public.click_stats(integer);
create or replace function public.click_stats(p_days integer default 30, p_refs text[] default null)
returns table (ref text, clicks bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.ref, sum(c.clicks)::bigint
  from public.click_daily c
  where c.day > (now() at time zone 'America/Sao_Paulo')::date - p_days
    and (p_refs is null or c.ref = any (p_refs))
  group by c.ref;
$$;
revoke execute on function public.click_stats(integer, text[]) from public;
grant execute on function public.click_stats(integer, text[]) to authenticated;

-- Produtos no ar, cadastrados há mais de p_min_age_days, sem nenhum clique nos últimos p_days
create or replace function public.cold_products_count(p_days integer default 30, p_min_age_days integer default 7)
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)
  from public.products p
  where p.active
    and p.created_at < now() - make_interval(days => p_min_age_days)
    and not exists (
      select 1 from public.click_daily c
      where c.ref = 'p:' || p.id
        and c.day > (now() at time zone 'America/Sao_Paulo')::date - p_days
    );
$$;
revoke execute on function public.cold_products_count(integer, integer) from public;
grant execute on function public.cold_products_count(integer, integer) to authenticated;

-- Todas as categorias (inclui produtos fora do ar; RLS: só admin vê os inativos)
create or replace function public.all_categories()
returns table (category text)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct p.category from public.products p order by 1;
$$;
revoke execute on function public.all_categories() from public;
grant execute on function public.all_categories() to authenticated;
