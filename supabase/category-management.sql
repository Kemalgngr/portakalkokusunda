-- SQL Editor'da tamamını çalıştırın. Mevcut ürünleri değiştirmez.
begin;
grant update, delete on public.categories to authenticated;
drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories
for update to authenticated
using ((select public.is_menu_admin()))
with check ((select public.is_menu_admin()));
drop policy if exists categories_delete on public.categories;
create policy categories_delete on public.categories
for delete to authenticated
using ((select public.is_menu_admin()));
commit;
