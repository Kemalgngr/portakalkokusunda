-- Mevcut ürün/fiyat/sıralamaları koruyarak yeni menü ve ürünleri ekler.
begin;
-- Yeni menüler mevcut sekmelerin sonuna eklenir.
insert into public.categories(name,sort_order)
select v.name, (select coalesce(max(sort_order),0) from public.categories)+v.offset_order
from (values ('Salatalar',1),('Ek Hizmetler',2)) as v(name,offset_order)
on conflict (name) do nothing;

insert into public.products(name,description,price,category,badge)
select v.* from (values
 ('Mevsim Salata','Mevsimin taze yeşillikleriyle hazırlanan salata.',85,'Salatalar',''),
 ('Söğüş Salata','Domates, salatalık ve biberle sade, ferah bir eşlikçi.',75,'Salatalar',''),
 ('Tablacı Salatası','Domates, soğan, maydanoz ve sumakla hazırlanan salata.',90,'Salatalar',''),
 ('Ayran (Bardak)','Yemeklerin ve el açması lezzetlerin serin eşlikçisi. Bir bardak.',25,'İçecekler',''),
 ('Ayran (Litre)','Sofrada paylaşmak için 1 litre ayran.',90,'İçecekler',''),
 ('Et / Tavuk / Köfte Pişirme (1 kg)',
  'Etinizi, tavuğunuzu veya köftenizi siz getirin, biz pişirelim. Pişirme bedeli kilogram başına 100 TL’dir; et, tavuk veya köfte bu fiyata dahil değildir. Yanına salata ve içecekleri menümüzden ayrıca seçebilirsiniz; ayrı ücretlendirilir.',
  100,'Ek Hizmetler','PİŞİRME BEDELİ · 1 KG')
) as v(name,description,price,category,badge)
where not exists(select 1 from public.products p where p.name=v.name and p.category=v.category);
commit;
