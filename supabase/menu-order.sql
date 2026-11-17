-- SQL Editor'da tamamını bir kez çalıştırın. Mevcut menü sırasını değiştirmez.
begin;
grant update on public.categories to authenticated;
drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories
for update to authenticated
using ((select public.is_menu_admin())) with check ((select public.is_menu_admin()));

create or replace function public.reorder_categories(menu_names text[])
returns void language plpgsql security invoker set search_path = ''
as $$
declare total integer;
begin
 if not public.is_menu_admin() then
  raise exception 'Yönetici yetkisi gerekli' using errcode='42501';
 end if;
 perform name from public.categories for update;
 select count(*) into total from public.categories;
 if menu_names is null or cardinality(menu_names)<>total
    or (select count(distinct name) from unnest(menu_names) as t(name))<>total
    or exists(select 1 from unnest(menu_names) as t(name)
      where not exists(select 1 from public.categories c where c.name=t.name)) then
  raise exception 'Menü listesi değişmiş. Sayfayı yenileyip tekrar deneyin.';
 end if;
 update public.categories c set sort_order=u.pos::integer
 from unnest(menu_names) with ordinality as u(name,pos)
 where c.name=u.name;
end;
$$;
revoke all on function public.reorder_categories(text[]) from public, anon;
grant execute on function public.reorder_categories(text[]) to authenticated;
commit;
