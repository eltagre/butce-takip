# Bütçem – Finans Merkezi

V8.7.3, V8.7.2 (dc01b1a) üzerinde fiş tarayıcı ve arayüz güncellemesidir. Uygulama HTML, CSS ve JavaScript ile GitHub Pages üzerinde çalışır. Bu dal Supabase şema geçişi gerektirmez.

## Fiş tarayıcı

- `receipt-parser.js` market başlıklarını, miktar ve birim fiyatı, indirim satırlarını, vergi ve ödeme özetlerini tanır. Hesaplar kuruş cinsinden tam sayılarla yapılır. Ürün adı veya barkod eşlemesi tekil olduğunda indirim ürüne bağlanır. Diğer indirimler, kullanıcı tarafından ürünle eşleştirilebilir, fişe orantılı dağıtılabilir veya bilgi satırı olarak işaretlenebilir.
- `receipts.js` fiş üzerindeki toplamı hesaplanan netle karşılaştırır. Belirsiz indirim ve tutar farkı giderilmeden kayıt açılmaz. Sıfır netli ürün, önizlemede görünür ve harcama satırı oluşturmaz. Kayıt grubunun notunda toplam tasarruf gösterilir. Eski fiş kayıtları ve yerel fotoğraf arşivi aynı biçimde okunur.
- `receipt-image.js` döndürme, dört köşeyle perspektif düzeltme, kontrast ve yerel gölge azaltma sağlar. Bulanıklık uyarısı görüntü keskinliği kestirimidir. Düşük OCR güveninde farklı işleme seçeneğiyle yeniden okumak veya metni düzeltmek mümkündür. Tesseract tarayıcıda çalışır. İlk OCR kullanımı motoru ve dil dosyalarını indirmek için ağ erişimi ister.

## Görüntü işleme karşılaştırması

Aynı 173,50 TL tutarlı sentetik fiş, temiz görüntü ve fotoğraf çekiminde karşılaşılabilecek gölge, optik bulanıklık ve perspektif bozulmalarıyla denendi. Uygulamanın Canvas çıktıları Tesseract CLI (`eng`, PSM 6) ile okundu. Başarı, üç ürünün ve net tutarın kuruşuna kadar doğrulanmasıdır.

| Görüntü | Orijinal | Kontrast | Gölge azaltma |
| --- | --- | --- | --- |
| Temiz | Doğrulandı | Doğrulandı | Doğrulandı |
| Yoğun gölge | Başarısız | Başarısız | Doğrulandı |
| Bulanıklık | Doğrulandı | 0,60 TL fark | Doğrulandı |
| Eğik, dört köşe düzeltmesi sonrası | Tutar uyuşmadı | Doğrulandı | Toplam okunamadı |

Köşeler düzeltilmeden eğik örnek doğrulanamadı. Bu küçük sentetik küme gerçek market fotoğraflarındaki doğruluk oranını göstermez. Playwright, fotoğraf seçme, döndürme, düzeltme ve OCR bağımsız değişkenlerini sentetik bir worker ile kontrol eder.

## Arayüz ve doğrulama

Masaüstünde sabit yan menü, mobilde dokunmaya uygun alt gezinme, tutarlı SVG ikonlar ve açık/koyu tema bulunur. Özet ekranı bütçe ile temel göstergeleri bir araya getirir. Hesap, varlık ve yatırım ekranları mevcut veri modelini kullanır. Modül tercihleri aynı yerel ayarlarda saklanır. Grafik ayrıntıları dokunma, fare ve klavyeyle açılır.

```sh
npm ci
npm test
npx playwright install --with-deps chromium webkit
npm run test:browser
```

GitHub Actions aynı komutları çalıştırır. Tarayıcı projeleri masaüstü Chromium, Android profilli Chromium ve iPhone profilli WebKit’i kapsar. Bütçe, backtest, fiş kaydı, modül tercihleri, tema ve çevrimdışı uygulama kabuğu test edilir. Fiziksel telefonlar ve anonimleştirilmiş gerçek market fotoğrafları ayrı bir doğrulama kapsamıdır.
