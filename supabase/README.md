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
