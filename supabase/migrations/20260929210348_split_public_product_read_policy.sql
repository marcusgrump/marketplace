drop policy "Produtos ativos são públicos" on public.products;
create policy "Visitantes veem produtos ativos" on public.products
  for select to anon using (active);
create policy "Logados veem ativos e admins veem todos" on public.products
  for select to authenticated using (active or (select private.is_admin()));
