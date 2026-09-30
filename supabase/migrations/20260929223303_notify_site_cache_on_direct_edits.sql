create extension if not exists pg_net with schema extensions;

insert into public.settings (key, value)
values ('site_url', 'https://marketplace-azure-kappa.vercel.app')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Avisa o site para limpar o cache quando algo muda FORA do painel (editor do Supabase, SQL).
-- Mudanças feitas pelo painel (papel "authenticated") já limpam o cache pelo próprio site,
-- então são ignoradas aqui: evita chamadas repetidas, por exemplo ao atualizar preços.
create or replace function private.notify_site_cache()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_token text;
  v_tags jsonb;
begin
  if (select auth.role()) = 'authenticated' then
    return null;
  end if;

  select value into v_url from public.settings where key = 'site_url';
  select value into v_token from public.settings where key = 'server_token';
  if v_url is null or v_token is null then
    return null;
  end if;

  v_tags := case tg_table_name
    when 'products' then '["products"]'::jsonb
    when 'sections' then '["sections"]'::jsonb
    else '["shopee", "sections"]'::jsonb -- settings: credenciais da Shopee
  end;

  perform net.http_post(
    url := v_url || '/api/revalidate',
    body := jsonb_build_object('tags', v_tags),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-revalidate-secret', v_token)
  );
  return null;
end;
$$;
revoke execute on function private.notify_site_cache() from public;

create trigger products_notify_site after insert or update or delete on public.products
  for each statement execute function private.notify_site_cache();
create trigger sections_notify_site after insert or update or delete on public.sections
  for each statement execute function private.notify_site_cache();
create trigger settings_notify_site after insert or update or delete on public.settings
  for each statement execute function private.notify_site_cache();
