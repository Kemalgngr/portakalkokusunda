# Ücretsiz yayın kurulumu

Güncel web sürümü `public/` klasörüdür; artık Python API yerine Supabase Auth ve REST API kullanır. `server.py` yalnızca eski yerel API testleri ve statik önizleme için tutulur. Python şifresi web sürümünde kullanılmaz.

1. Supabase SQL Editor'da `setup.sql` dosyasının tamamını çalıştırın.
2. Authentication > Users'ta bir kullanıcı oluşturun. Kendiniz ve işletme sahibi için ayrı hesaplar kullanabilirsiniz.
3. SQL Editor'da aşağıdaki sorguda e-postayı kendi oluşturduğunuz hesabın e-postasıyla değiştirip çalıştırın. Yalnızca sizin seçtiğiniz hesaba yönetici yetkisi verir. Önce kullanıcıyı oluşturmuş olmalısınız.

```sql
insert into public.menu_admins (user_id)
select id from auth.users where lower(email) = lower('YONETICI_EPOSTASI_BURAYA')
on conflict do nothing
returning user_id;
```

Sonuçta bir satır dönmeli. Satır dönmediyse e-postayı ve kullanıcının oluşturulduğunu kontrol edin. Başka bir yönetici için aynı sorguyu o hesabın e-postasıyla çalıştırın. Yetki kaldırmak için ilgili `user_id` kaydını `menu_admins` tablosundan silin. Her giriş yapan kullanıcı otomatik yönetici değildir. Kullanıcılar yönetici listesini okuyamaz veya değiştiremez.

4. Authentication ayarlarında herkese açık yeni kullanıcı kaydını kapatın; kullanıcıları panelden oluşturun.
5. Cloudflare Pages'te statik dosya yükleme ile `public/` klasörünün içeriğini yükleyin. Python ve veritabanı dosyalarını yüklemeyin. Build komutu yoktur. Git bağlantısı kullanılırsa çıktı klasörü `public` olmalıdır. Workers kullanılıyorsa deploy komutu `npx wrangler deploy --assets ./public` olur. Cloudflare, `admin.html` dosyasını `/admin` adresinde otomatik sunar. Bu adresi tekrar `/admin.html` adresine yönlendiren `_redirects` kuralı eklemeyin; otomatik HTML adres düzenlemesiyle döngü oluşturur. Güvenlik başlıkları `_headers` dosyasında hazırdır.
6. Pages adresinde müşteri menüsünü ve `/admin` girişini kontrol edin. Yönetici hesabıyla fiyat değiştirin; gizli tarayıcı penceresinde güncellemeyi görün. Gizlenen ürünlerin müşteriye dönmediğini ve yöneticisiz yazma isteklerinin engellendiğini canlıda doğrulayın.

`config.js` yalnızca herkese açık proje adresi ve publishable anahtar içerir. Secret/service_role anahtarını asla eklemeyin. Oturum yalnızca ilgili sekmenin sessionStorage alanında tutulur. Veriler Supabase'de saklanır; ücretsiz planın güncel kotaları, duraklatma ve yedekleme koşulları sağlayıcı panelinden kontrol edilmelidir. Bu makineden Supabase'e istek proxy 403 hatasıyla engellendi; canlı SQL/RLS kuralları ve gerçek giriş henüz doğrulanmadı. SQL dosyası panelde çalıştırılmadan menü veritabanı kurulmuş olmaz.

## Yeni kategori yönetimi ve menü güncellemesi

`setup.sql` sonrasında SQL Editor'da `menu-update.sql` dosyasının tamamını çalıştırın (mevcut kurulumlarda yalnızca `menu-update.sql` yeterlidir). Bu işlem ürünleri koruyarak `categories` tablosunu ekler, kategori alanını bu tabloya bağlar, eski kategori adlarını değiştirir ve istenen ürün/fiyat güncellemelerini uygular. İşlem tek transaction içinde çalışır; bir hata durumunda tamamı geri alınır. Yeni ürünler aynı isimde ürün yoksa eklenir. Script tekrar çalıştırılırsa serpme kahvaltı ve çay bilgileri tekrar belirtilen değerlere döner; rutin olarak çalıştırmayın.

Yeni kategori yazma yetkisi yalnızca `menu_admins` listesindeki hesaplara aittir. Tüm ziyaretçiler kategori adlarını okuyabilir; gizli ürünleri okuma ve ürün yazma kuralları değişmez. Yönetici ekranındaki “Menü / kategori ekle” formuyla sekme oluşturun, ardından ürün formunda kategoriyi seçip ürünü kaydedin. Kategori oluşturma işlemi ürünlerden bağımsızdır; boş sekmeler de müşteri menüsünde görünür.

Tarayıcı akış testi: `node tests/menu-ui.cjs` (Playwright ve `/usr/bin/chromium` gerekir). Test Supabase yanıtlarını taklit eder; canlı RLS testi değildir. Canlıda SQL uygulandıktan sonra normal yöneticiyle kategori ekleme/ürün ekleme ve gizli pencerede müşteri görünümü doğrulanmalıdır.

## Yöresel ve doğal ürünler

Kategori güncellemesi daha önce uygulandıysa yalnızca `natural-products.sql` dosyasını SQL Editor'da çalıştırın. Henüz uygulanmadıysa güncel `menu-update.sql` bu eklemeleri de içerir. İki dosya aynı isim ve kategorideki mevcut ürünleri çoğaltmaz; mevcut ürün fiyatlarını değiştirmez. Yeni kategori sırası 60'tır; İçecekler (50) sonrasında ve yöneticinin eklediği varsayılan sıralı kategorilerden (100) önce gelir. Fiyatlar örnektir, yönetici panelinden değiştirilebilir.

## Menü adını düzenleme ve silme

Kategori kurulumu sonrasında `category-management.sql` dosyasını bir kez SQL Editor'da çalıştırın. UPDATE ve DELETE izinleri RLS ile yalnızca menü yöneticilerine verilir. Yönetici ekranında ürün listesinin altında Menüler bölümü bulunur. İsim değişiklikleri `products_category_fkey` üzerindeki `ON UPDATE CASCADE` ile ürünlere yansır. Ürün içeren menüler (gizli ürünler dahil) arayüz ve veritabanının `ON DELETE RESTRICT` kuralıyla silinemez. Önce ürünleri başka menüye taşıyın veya silin. Boş menü silindikten sonra müşteri menüsünden kaldırılır. Bu SQL yeni kategori eklemez veya Tatlılar'a ürün eklemez.

## Ürün sıralaması

`product-order.sql` dosyasını SQL Editor'da bir kez çalıştırın. Mevcut ürün sırası korunarak `sort_order` alanı eklenir. Yeni ürünler varsayılan olarak sona gelir; eşit numaralarda id belirleyicidir. Yönetici ekranında Ürün sıralaması bölümünden menü seçip numara veya yukarı/aşağı düğmeleriyle taslak sırayı değiştirin, Sıralamayı kaydet'e basın. Menü değiştirmek veya sayfayı yenilemek kaydedilmemiş sırayı sıfırlar. Gizli ürünler de sıralamaya dahildir. `reorder_products` fonksiyonu yönetici yetkisini ve kategoriye ait tam/tekrarsız ürün listesini doğrular, tüm sıralamayı tek transaction içinde uygular; yetkisiz hesaplar RLS ile engellenir. Liste eşzamanlı değişmişse yenileme istenir. Canlı Supabase testi ayrıca gereklidir.

## Adres ve harita konumu

`location-settings.sql` dosyasını bir kez SQL Editor'da çalıştırın. Tek satırlık `site_settings` tablosu eklenir; mevcut ayarlar yeniden çalıştırıldığında korunur. Adres ve harita bağlantısı herkese açık okunabilir; yalnızca yöneticiler güncelleyebilir. Kullanıcıların INSERT/DELETE izni yoktur. Yönetici ekranındaki Adres ve yol tarifi formuna adres ve HTTPS Google Haritalar paylaşım bağlantısını girin. Konumu kontrol et düğmesi kaydetmeden bağlantıyı denemeye yarar. Müşteri menüsünün üst ve alt harita düğmeleri ile alt adres yazısı kaydedilen ayarları kullanır; açık sayfa yenilenince veya tekrar ön plana gelince güncellenir. Konum değişikliği, kart üzerindeki basılı adrese veya ana sayfanın Doruklu tanıtım metinlerine uygulanmaz. Statik QR kartındaki basılı adresi değiştirmek ayrı baskı güncellemesidir. Ayarlar yüklenemezse müşteri menüsündeki mevcut adres ve harita bağlantısı korunur; yönetici ekranı kurulum/bağlantı uyarısı verir.

## Menü sekmelerinin sıralaması

`menu-order.sql` dosyasını SQL Editor'da bir kez çalıştırın. Yönetici ekranındaki Menü sıralaması alanında numara/oklarla sekmeleri sıralayıp Menü sıralamasını kaydet düğmesine basın. `reorder_categories` yalnızca yöneticiler için ve eksiksiz/tekrarsız menü isim listesiyle çalışır; isimler ve ürünler değiştirilmeden `categories.sort_order` tek transaction içinde güncellenir. Başka bir yönetici menü listesini değiştirdiyse yeniden yükleme gerekir. Müşteri sekmeleri ve yönetici kategori seçim alanları kaydedilen sıralamayı kullanır. Adres ve yol tarifi bölümü yönetim ekranının en altındadır.
