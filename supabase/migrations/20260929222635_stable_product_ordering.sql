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
  -- p.id desempata produtos criados no mesmo instante, para a paginação não repetir nem pular itens
  order by p.featured desc, p.created_at desc, p.id
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;
