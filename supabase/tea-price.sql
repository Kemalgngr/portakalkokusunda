-- Supabase SQL Editor: yalnızca çay fiyatını günceller.
update public.products set price = 20
where name = 'Demleme Çay'
returning name, price;
