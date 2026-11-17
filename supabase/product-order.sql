-- Supabase SQL Editor'da bir kez çalıştırın. Ürünleri/fiyatları korur.
begin;
alter table public.products add column if not exists sort_order integer not null default 2147483647;
-- Daha önce sıralanmamış ürünlerin mevcut görünüm sırasını koru.
with ranked as (
 select id, row_number() over(partition by category order by id)::integer as pos
 from public.products
)
update public.products p set sort_order=r.pos from ranked r
where p.id=r.id and p.sort_order=2147483647;

create or replace function public.reorder_products(menu_name text, product_ids bigint[])
returns void language plpgsql security invoker set search_path = ''
as $$
declare total integer;
begin
 if not public.is_menu_admin() then
  raise exception 'Yönetici yetkisi gerekli' using errcode='42501';
 end if;
 perform id from public.products where category=menu_name for update;
 select count(*) into total from public.products where category=menu_name;
 if product_ids is null or cardinality(product_ids)<>total
    or (select count(distinct id) from unnest(product_ids) as t(id))<>total
    or exists(select 1 from unnest(product_ids) as t(id)
      where not exists(select 1 from public.products p where p.id=t.id and p.category=menu_name)) then
  raise exception 'Ürün listesi değişmiş. Sayfayı yenileyip tekrar deneyin.';
 end if;
 update public.products p set sort_order=u.pos::integer
 from unnest(product_ids) with ordinality as u(id,pos)
 where p.id=u.id and p.category=menu_name;
end;
$$;
revoke all on function public.reorder_products(text,bigint[]) from public, anon;
grant execute on function public.reorder_products(text,bigint[]) to authenticated;
commit;
