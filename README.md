# Bütçem V9.0 – Finansal Analiz ve Planlama Merkezi

Bütçem, GitHub Pages üzerinde çalışan HTML/CSS/JavaScript uygulamasıdır. V9.0 dalı, PR #3 aracılığıyla ana dala giren V8.7.4 (`80d59e6`) üzerine kuruldu. Önceki bulut ve izolasyon taslağı PR #2 ana dalda değildi. Geçişin oradaki işlem silme migration kimliği korundu.

## Modüller

- Varlıklar sekmesindeki Simülasyon aracında servet, hedef, finansal özgürlük ve gayrimenkul senaryoları bulunur. Simülasyon, Sağlık ve Analiz modülleri isteğe bağlıdır. Servet geçmişi ve isteğe bağlı Servet Konumum özelliği korunur.
- Finansal Sağlık son üç tamamlanmış takvim ayını kullanır. Gelir, gider, borç, likit acil fon, aylık bütçe ve portföy kapsamı tamamlanmadan resmi olmayan kesin puan gösterilmez. İsteğe bağlı kaydedilen aylık puan geçmişi gösterilir.
- Analiz, tarihli servet ve kur kayıtları, sınıf/para birimi/likidite dağılımı, harcamalar ve hedef hareketlerinden türetilir. İlk ve son snapshot’ta uygun veri varsa TL, USD, altın ve BTC değişimi gösterilir. Reel değişim, aynı döneme ait TÜFE oranıyla hesaplanabilir. Net yeni sermaye kullanıcı tarafından belirtilirse nominal fark ayrıca gösterilir.
- Alışveriş analizi Bütçe ekranındadır. Onaylanan yeni fişlerden fiyat geçmişi ve market dağılımı oluşturur. Markası veya barkodu bilinmeyen ürünleri eşleştirmek için kullanıcı açıkça bir karşılaştırma adı seçebilir. Belirsiz OCR adları otomatik birleştirilmez.
- Hesaplar’daki planlama ekranı borç, kart ve tahmini ya da gerçekleşmiş pasif gelir kayıtlarını tutar. Kart ödemesi için mevcut hesaplar arası transfer akışını açar. Planlar işlem defterine otomatik gelir veya gider yazmaz.
- Bütçe ekranındaki aylık rapor, seçilen bölümlerle yazdırılabilir veya tarayıcıdan PDF olarak kaydedilebilir. Hedefler, seçilen rapor ayından bağımsız olarak mevcut ilerlemeyle etiketlenir.

## Finansal yöntemler

- Parasal girdiler ve defter analizleri tam kuruş kullanır. Varsayımsal oranlı sonuçlar ve aylık faiz işlemleri kuruşa yuvarlanır. Aylık bileşik eşdeğer `(1 + yıllık oran)^(1/12) - 1`, reel oran `(1 + nominal oran)/(1 + enflasyon) - 1` ile hesaplanır. Hedef katkısı simülasyon ve ikili aramayla bulunur. Ay başı ve ay sonu katkıları ayrı işlenir.
- Gelecekteki USD, altın ve BTC gösterimi, kullanıcının girdiği son dönem fiyat varsayımını kullanır. Servet analizindeki tarihli fiyatlar ayrı tutulur. Portföy oynaklığı bugünkü adetlerin ortak ay sonu TL fiyatlarıyla oluşturulan geçmiş senaryonun aylık getirilerinden hesaplanır. En az yedi tamamlanmış ay gereklidir. Bu sonuç gerçekleşen portföy getirisi değildir.
- Kredi takvimi nominal yıllık oranın 12’ye bölünmesiyle aylık faiz uygular. Gayrimenkul sonucu boş kalma, masraflar, kalan kredi ve net nakit akışını dikkate alır. Alternatif karşılaştırmasında aynı başlangıç öz sermayesi ve yeniden değerlenen yıllık nakit akışları kullanılır.
- Kişisel sepet, ardışık aylardaki en az üç eşleşen ürün için önceki ayın miktarlarını sabit tutar. Fiyatlar kg, litre veya adet bazına çevrilir. Sonradan düzenlenen tutarlarda önceki indirim kazanımı yeniden varsayılmaz.

## Veri ve yayın sırası

- `financeV9` sürüm 1, mevcut `butcem_intelligence_state.payload` ve kullanıcı kapsamlı yerel analiz kaydı içinde saklanır. Fiş satırları, borç ve kart planları, pasif gelir planları, sağlık geçmişi ve yeni hedef katkı kayıtları ayrı kimlik ve revizyon taşır. JSON yedek sürüm 2 bu alanı içerir. Eski bütçe yedekleri açılabilir. Fotoğraflar yalnızca isteğe bağlı yerel arşivde tutulur.
- İki Supabase migration, işlem silme işaretleri ile eski işlem yazmalarına karşı koruma ve V9 kayıtlarının sunucu tarafında revizyon bazında birleşmesini sağlar. Yerel üç yönlü birleştirme, finans/servet belgelerinde bağımsız alan değişikliklerini birleştirir. Yazmadan önce bulut revizyonu karşılaştırılır. Plan silmeleri kalıcı işaret olarak eşitlenir.
- Üretim metadata kontrolünde beş kişisel finans tablosunda RLS etkin ve sahiplik politikaları mevcuttu. Üretime migration veya web dağıtımı yapılmadı. Yeni sürüm, silme şeması hazır değilse eşitlemeyi durdurur ve yerel kayıtları korur. Test ortamında iki gerçek oturumla geçişi doğruladıktan sonra **iki migration’ı GitHub Pages V9.0’dan önce** uygula. PR #2’deki ortak migration daha önce uygulandıysa aynı kimliği ikinci kez çalıştırma.
- Geçiş öncesi silmeler için güvenilir geçmiş yok. Yükseltme öncesi istemciler finans ve servet için yeni istemci birleştirme yöntemini kullanmaz. Yerel tarayıcı kapsamı uygulama sınırıdır. Ortak tarayıcı profiline erişime karşı disk şifrelemesi sunmaz.

## Test

```sh
npm ci
npm test
npx playwright install --with-deps chromium webkit
npm run test:browser
```

Testler OCR/para matematiği, iki kullanıcıyla PGlite RLS ve migration davranışı, bütçe/portföy regresyonu, PWA, rehber, mobil ve masaüstüyle birlikte yeni V9 akışlarını kapsar. WebKit profili fiziksel iPhone değildir. Gerçek market fişi koleksiyonu, üretim hesabıyla iki cihazlı eşitleme, fiziksel telefonlar ve canlı piyasa sağlayıcıları ayrıca doğrulanmalıdır.
