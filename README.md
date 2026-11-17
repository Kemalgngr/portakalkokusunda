# Portakal Kokusunda

## Cloudflare Pages + Supabase (güncel web sürümü)

Canlı yayın için `public/` klasörünü kullanın. Cloudflare Pages GitHub kurulumunda framework `None`, build komutu boş ve build output directory `public` olmalıdır. Root directory boş bırakılır. Python sunucusu Cloudflare üzerinde çalıştırılmaz.

Menü ve yönetici ekranı Supabase'e bağlanır. Veritabanı kurulumu ve yönetici yetkisi için [Supabase yönergelerini](supabase/README.md) izleyin. Müşteri adresi `/`, yönetici adresi `/admin` olur. `public/config.js` yalnızca herkese açık proje adresi ve publishable key içerir; gizli anahtar eklemeyin.

Yayın sonrası müşteri menüsü, yönetici girişi, ürün ekleme/fiyat değiştirme ve gizleme gerçek Supabase üzerinde doğrulanmalıdır. Yerel API testleri Supabase RLS doğrulamasının yerine geçmez.

Statik önizleme: `python3 server.py --port 3000`. Web arayüzü bu modda da Supabase bağlantısı kullanır.

## Eski yerel Python API sürümü

Aşağıdaki Python şifre ve SQLite açıklamaları eski `/api/` uç noktalarına aittir; güncel web arayüzü bunları kullanmaz.

Doruklu, Mersin için mobil uyumlu QR menü ve işletmeye özel ürün yönetimi. Python 3.12+ yeterlidir; ek paket gerekmez.

## Çalıştırma

```sh
cd /workspace/portakalkokusunda
python3 server.py --set-password
python3 server.py --port 3000
```

İlk komut şifreyi gizli olarak sorar. En az 12 karakter kullanın; hazır veya varsayılan yönetici şifresi yoktur. Müşteri menüsü `/`, yönetim `/admin` adresindedir. Yönetici fiyat, açıklama, etiket, kategori, görünürlük ve ürün ekleme/silme işlemlerini telefondan yapabilir. Öğle yemeği “Günün Menüsü” kategorisindedir. Açık müşteri sayfası tekrar ön plana geldiğinde menü yenilenir; kesintisiz anlık güncelleme bağlantısı kullanılmaz.

SQLite veritabanı ilk çalıştırmada örnek ürünlerle `data/menu.sqlite3` altında oluşturulur. Menü ve şifre özeti sunucuda kalır. Bu dizini kalıcı diskte tutun ve düzenli yedekleyin. İsteğe bağlı `MENU_DB` değişkeni ile farklı veritabanı yolu verilebilir. Oturumlar 8 saat sürer; sunucu yeniden başlayınca tekrar giriş gerekir.

## Yayına alma ve QR

Bu sürüm yerel olarak çalışır; henüz internet adresi ve basılabilir QR kodu oluşturulmadı. Canlı kullanım için kalıcı diskli bir sunucu, alan adı ve HTTPS gerekir. HTTPS ters vekilinin arkasında `COOKIE_SECURE=1 python3 server.py --port 3000` çalıştırın; vekil özgün Host başlığını korumalıdır. Yönetici şifresini sunucudaki gizli giriş komutuyla belirleyin. Şifreyi kaynak koda veya sohbetlere yazmayın. Gerçek işletme fiyatlarını ve içeriklerini girip “örnek menü” açıklamasını yayına alma aşamasında kaldırın. Sabit HTTPS müşteri adresi için üretilecek QR kod, fiyatlar değişince aynı kalır.

Portakal görselleri yerel SVG çizimleridir; dış görsel servisi gerektirmez. Yazı tipleri Google Fonts üzerinden yüklenir; bağlantı yoksa sistem yazı tipleri kullanılır. İşletmeye ait fotoğraflar daha sonra eklenebilir. Sipariş, ödeme, çoklu yönetici ve şifre kurtarma akışları bu sürümün kapsamında değildir.

## Doğrulama

```sh
python3 -m unittest discover -s tests -v
node --check public/app.js
node --check public/admin.js
```

Testler geçici veritabanında gerçek HTTP istekleriyle giriş, yetkisiz yazma engeli, ürün ekleme/güncelleme/gizleme/silme, kalıcı kayıt, çıkış, giriş deneme sınırı ve özel dosya korumasını denetler. Python sunucusu küçük ölçekli ilk sürüm içindir; geniş ölçekli yayın öncesinde işletim ve yedekleme düzeni değerlendirilmelidir.
