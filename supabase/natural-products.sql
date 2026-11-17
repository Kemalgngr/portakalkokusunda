-- Önce menu-update.sql uygulanmış olmalıdır. Mevcut fiyatları değiştirmez.
begin;
insert into public.categories(name,sort_order)
values ('Yöresel ve Doğal Ürünler',60)
on conflict (name) do nothing;

insert into public.products(name,description,price,category,badge)
select name,description,price,'Yöresel ve Doğal Ürünler',''
from (values
 ('Köy Yumurtası (30 adet)','30 adetlik koli.',250),
 ('Doğal Zeytinyağı (1 kg)','1 kg ambalaj.',450),
 ('El Yapımı Yeşil Zeytin (5 kg)','5 kg ambalaj.',800)
) as v(name,description,price)
where not exists(select 1 from public.products p
 where p.name=v.name and p.category='Yöresel ve Doğal Ürünler');
commit;
