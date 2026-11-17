-- Supabase SQL Editor: run the complete file. Safe to rerun.
begin;
create table if not exists public.menu_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.menu_admins enable row level security;
revoke all on public.menu_admins from anon, authenticated;

create or replace function public.is_menu_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.menu_admins where user_id = (select auth.uid())); $$;
revoke all on function public.is_menu_admin() from public;
grant execute on function public.is_menu_admin() to anon, authenticated;

create table if not exists public.products (
 id bigint generated always as identity primary key,
 name text not null check(length(trim(name)) between 1 and 100),
 description text not null default '' check(length(description)<=1000),
 price numeric(10,2) not null check(price>=0 and price<=100000),
 category text not null check(category in ('Kahvaltı','Sıkma & Gözleme','Günün Menüsü','İçecekler')),
 badge text not null default '' check(length(badge)<=80),
 available boolean not null default true
);
alter table public.products enable row level security;
revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant usage, select on sequence public.products_id_seq to authenticated;
drop policy if exists menu_read on public.products;
create policy menu_read on public.products for select to anon, authenticated
 using (available or (select public.is_menu_admin()));
drop policy if exists menu_insert on public.products;
create policy menu_insert on public.products for insert to authenticated
 with check ((select public.is_menu_admin()));
drop policy if exists menu_update on public.products;
create policy menu_update on public.products for update to authenticated
 using ((select public.is_menu_admin())) with check ((select public.is_menu_admin()));
drop policy if exists menu_delete on public.products;
create policy menu_delete on public.products for delete to authenticated
 using ((select public.is_menu_admin()));

insert into public.products(name,description,price,category,badge)
select v.* from (values
 ('Serpme Kahvaltı','Yöresel peynirler, zeytin, ev reçelleri, bal, tereyağı ve yumurta. İki kişilik.',850,'Kahvaltı','SOFRANIN YILDIZI'),
 ('Menemen','Domates, biber ve yumurtanın sıcacık buluşması.',180,'Kahvaltı',''),
 ('Peynirli Sıkma','İncecik açılan hamur, yöresel peynir ve maydanoz.',85,'Sıkma & Gözleme','YÖRESEL'),
 ('Patatesli Gözleme','Sac üzerinde pişen, el açması ve bol içli.',140,'Sıkma & Gözleme',''),
 ('Ev Böreği','Çıtır çıtır, fırından yeni çıkmış peynirli börek.',120,'Sıkma & Gözleme',''),
 ('Kuru Fasulye & Pilav','Yanında turşu ve ayran ile ev yapımı öğle sofrası.',250,'Günün Menüsü','GÜNÜN FIX MENÜSÜ'),
 ('Demleme Çay','Odun ateşinde sobada demlenmiş çay.',20,'İçecekler',''),
 ('Türk Kahvesi','Sohbetin en güzel eşlikçisi.',80,'İçecekler',''),
 ('Taze Portakal Suyu','Portakalın en ferah hali. Mevsiminde.',100,'İçecekler','')
) as v(name,description,price,category,badge)
where not exists(select 1 from public.products);
commit;
