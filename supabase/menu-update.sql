-- SQL Editor'da tamamını çalıştırın. Mevcut ürünleri ve yönetici hesaplarını korur.
begin;
create table if not exists public.categories (
 name text primary key check (length(trim(name)) between 1 and 60),
 sort_order integer not null default 100
);
alter table public.categories enable row level security;
revoke all on public.categories from anon, authenticated;
grant select on public.categories to anon, authenticated;
grant insert on public.categories to authenticated;
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select to anon, authenticated using (true);
drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories for insert to authenticated
 with check ((select public.is_menu_admin()));

insert into public.categories(name,sort_order) values
 ('Kahvaltı',10),('Sıkma & Börek',20),('Yemekler',30),('Tatlılar',40),('İçecekler',50)
on conflict (name) do nothing;
alter table public.products drop constraint if exists products_category_check;
update public.products set category='Yemekler' where category='Günün Menüsü';
update public.products set category='Sıkma & Börek' where category='Sıkma & Gözleme';
insert into public.categories(name)
select distinct category from public.products on conflict (name) do nothing;
alter table public.products drop constraint if exists products_category_fkey;
alter table public.products add constraint products_category_fkey foreign key(category)
 references public.categories(name) on update cascade on delete restrict;

update public.products set price=250,
 description='Yöresel peynirler, zeytin, ev reçelleri, bal, tereyağı ve yumurta. 1 adet çay ikramımızdır.'
 where name='Serpme Kahvaltı';
update public.products set description='Odun ateşinde sobada demlenmiş çay.' where name='Demleme Çay';

insert into public.products(name,description,price,category,badge)
select v.* from (values
 ('Patates Kızartması','Çıtır çıtır kızarmış patates dilimleri.',90,'Kahvaltı',''),
 ('Sobada Közlenmiş Patates','Sobada ağır ağır közlenmiş, sıcacık patates.',80,'Kahvaltı',''),
 ('Peynirli Sıkma','El açması hamur ve yöresel peynir.',85,'Sıkma & Börek','YÖRESEL'),
 ('Ispanaklı Sıkma','El açması hamurda ıspanaklı iç harç.',85,'Sıkma & Börek',''),
 ('Kaşarlı Sıkma','Sıcacık hamur içinde eriyen kaşar peyniri.',100,'Sıkma & Börek',''),
 ('Peynirli Börek','El açması, bol peynirli börek.',110,'Sıkma & Börek',''),
 ('Ispanaklı Börek','Ispanaklı iç harcıyla el açması börek.',110,'Sıkma & Börek',''),
 ('Kaşarlı Börek','Eriyen kaşar peyniriyle sıcacık börek.',125,'Sıkma & Börek','')
) as v(name,description,price,category,badge)
where not exists(select 1 from public.products p where p.name=v.name);
commit;
