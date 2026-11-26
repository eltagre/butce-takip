# Bütçem – Finans Merkezi

GitHub Pages üzerinde çalışan HTML, CSS ve JavaScript uygulaması. Önerilen sürüm 8.8.0, V8.7.2 kaynaklarının üzerine hazırlanmıştır.

## Mimari

| Bileşen | Sorumluluk |
| --- | --- |
| `index.html`, `finance.css`, `app.js` | Bütçe ve işlem ekranları, hesaplar ve transferler, hedefler, portföy, piyasa fiyatları, servet analizi ve backtest |
| `statements.js` | CSV, Excel ve PDF dönüştürme, ekstresi önizleme, kategori önerileri, mükerrer kayıt kontrolü |
| `receipts.js`, `receipt-parser.js` | Tesseract ile tarayıcıda OCR, metin ayrıştırma, kuruş düzeyinde toplam kontrolü, isteğe bağlı IndexedDB fotoğraf arşivi |
| `sync-merge.js`, `supabase/migrations/` | Son bulut kopyasıyla üç yönlü birleştirme, sürüm karşılaştırması, kalıcı işlem silme işaretleri ve RLS ağırlıklı izolasyon |
| `sw.js`, `manifest.json` | Sürümlenmiş çevrimdışı uygulama kabuğu |
| Supabase Auth ve PostgreSQL | Oturum, cihazlar arası eşitleme ve kullanıcıya ait satırlar |
| Supabase `market-data` Edge Function | Twelve Data ve TCMB EVDS, piyasa önbelleği ve istek sınırları |

## İnceleme bulguları

- V8.7.2 tarayıcı verilerini ilk bağlanan kullanıcıya sabitliyordu. Hesap değişimlerinde artık uygulama hedef hesabın alanını yeni sayfada açıyor. Eski anahtarlar korunuyor ve yalnızca önceki sahibin alanına taşınıyor. Misafir verisi ilk bağlama sırasında onayla kopyalanabiliyor. Fotoğraf arşivi uygulama erişiminde hesap bazında filtreleniyor.
- Eski işlem silme kuyruğu buluta ulaştığında iz bırakmadan kaldırılıyordu. Supabase geçişi silme işaretini ve silmeyi tek işlemde yazıyor, eski istemcilerin fiziksel silmelerini de işaretliyor ve eski yazmaları reddediyor. Yeni istemci sayfalama kullanıyor ve değişmeyen işlemleri yeniden göndermiyor. Geçiş öncesindeki silmeler için güvenilir geçmiş bulunmadığından geriye dönük silme işareti üretilmiyor.
- Finans, portföy ve analiz bölümleri önceden tüm belgeyi yeniliyordu. Artık son görülen bulut kopyası üzerinden değişen alanlar ve kimlikli koleksiyonlar birleştiriliyor. Bulut satırı değişmişse yazma yeniden deneniyor. İlk eşitlemede önceden saklanmış ortak kopya olmadığı için eski silmeler her durumda ayırt edilemez. Aynı alan iki cihazda düzenlenirse zaman damgası tercih sırasını belirler. Eski sürüm istemcileri yeni birleştirme kurallarını uygulamaz.
- OCR metninde ödenecek tutar ile ara toplam, vergi ve ödeme satırları karışabiliyordu. Ayrıştırıcı farklı market adlarını, parçalı ürün satırlarını, ağırlıklı ürünleri ve indirimleri işler. Çelişkili toplamlar ya da uyuşmayan kuruşlar manuel doğrulama gerektirir.
- V8.7.2 service worker güncel betik adreslerini önbelleğe almıyordu. Yeni sürüm kabuğun tam dosya listesini önceden kaydeder. Kimlik doğrulama SDK’sı v2.119.2 sürümüne sabitlendi ve SHA-384 bütünlük kontrolüyle yerelden yüklenir. Piyasa istekleri ve kimlik doğrulama yanıtları service worker önbelleğine girmez. OCR dili, PDF ve Excel kütüphaneleri ilk kullanımda internet gerektirebilir. Çevrimdışı oturum erişimi geçerli cihaz oturumuna bağlıdır. SDK kaynak ve lisansı [jsDelivr](https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.2/).
- İçerik ve yedeklerden gelen bazı değerler HTML özniteliklerine veya CSV hücrelerine doğrudan ulaşıyordu. İncelenen dinamik HTML alanları ve CSV formül riskine açık dışa aktarma yolları düzeltildi.
- Üretim Supabase şeması salt okunur olarak incelendi. Finans tablolarında sahiplik politikaları etkindi ve `market-data` JWT doğrulaması açıktı. Piyasa hız sınırı RPC’si yalnızca servis rolüne açıktı. Supabase Advisor, otomatik RLS etkinleştirme fonksiyonunun çağrı izinleri, parola sızıntısı denetimi, bazı RLS sorgu planları ve kullanılmayan indeks hakkında bildirim verdi. Edge Function, EVDS isteğini Twelve Data hız sınırından önce işler. Bu bulgular için üretim ayarları veya Edge Function dağıtımı değiştirilmedi. [Supabase parola güvenliği](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Test ve yayın sırası

```sh
npm ci
npm test
npx playwright install --with-deps chromium webkit
npm run test:browser
```

Node testleri OCR metin örneklerini, üç yönlü birleştirmeyi ve geçişi PGlite üzerinde çalıştırır. Playwright masaüstü Chromium, Android profilli Chromium ve iPhone profilli WebKit çalıştırır. Hesap geçişi sentetik oturumlarla, PWA çevrimdışı açılışı tarayıcıda doğrulanır. İş akışı GitHub Actions içinde de çalışır.

1. Supabase geçişini önce bir test veritabanında iki ayrı kullanıcıyla doğrula. Geçişin ön koşulları üretimde görülen beş hesap tablosu ve mevcut sütun tipleridir.
2. Üretim yayını sırasında SQL geçişini GitHub Pages sürümünden önce uygula. Yeni istemci silme tablosu hazır olana kadar bulut eşitlemesini durdurur ve yerel veriyi kullanır.
3. Geçişten sonra kullanıcıya ait filtreli sorguları ve yeni sürümde iki cihazın eşitlemesini doğrula. Eski işlem kimliğiyle bir yedeği geri yüklemek, o işlem daha önce kalıcı olarak silindiyse bulutta aynı kimliği yeniden oluşturmaz. İşlemi yeniden eklemek için yeni işlem oluşturulabilir.

Gerçek market fotoğraflarıyla OCR doğruluğu, fiziksel iOS ve Android cihazlar, canlı piyasa sağlayıcıları ve üretim hesaplarıyla uçtan uca eşitleme ayrıca doğrulanmalıdır. Tarayıcı veri alanları aynı cihazda uygulama düzeyinde ayrılır. Tarayıcı profilinin kendisine erişebilen kişiler için cihaz düzeyinde şifreleme sağlamaz.
