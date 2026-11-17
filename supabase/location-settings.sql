-- Supabase SQL Editor'da tamamını bir kez çalıştırın.
begin;
create table if not exists public.site_settings (
 id integer primary key check (id=1),
 address text not null check (length(trim(address)) between 1 and 1000),
 map_url text not null check (length(map_url)<=2048 and map_url ~ '^https://[^[:space:]]+$')
);
alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
drop policy if exists settings_read on public.site_settings;
create policy settings_read on public.site_settings for select to anon, authenticated using (true);
drop policy if exists settings_update on public.site_settings;
create policy settings_update on public.site_settings for update to authenticated
using ((select public.is_menu_admin())) with check ((select public.is_menu_admin()));
insert into public.site_settings(id,address,map_url) values (
 1, E'Doruklu Mah, Toroslar Cd. No: 489\n33220 Toroslar / Mersin',
 'https://www.google.com/maps/search/?api=1&query=Doruklu+Mah+Toroslar+Cd+No+489+Toroslar+Mersin'
) on conflict (id) do nothing;
commit;
