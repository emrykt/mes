# MES Müşteri Yönetim Arayüzü — Teknik Spesifikasyon

**Proje:** Kiosk Tabanlı Hafif MES — Lisanslama, Abonelik ve Müşteri Yönetim Platformu
**Versiyon:** 1.0
**Tarih:** 2026-07-07
**Hedef:** Bu doküman Claude Code tarafından uygulamanın sıfırdan geliştirilmesi için hazırlanmıştır.

---

## 1. Genel Bakış

Küçük ve orta ölçekli sac metal işleyen işletmelere satılan kiosk tabanlı MES ürününün **ticari yönetim katmanı** geliştirilecektir. Tek kod tabanında, rol bazlı iki yüz bulunur:

1. **Admin Panel (iç ekip):** Tüm müşterilerin, aboneliklerin ve lisansların yönetildiği panel.
2. **Müşteri Portalı (self-servis):** Müşterinin kendi aboneliğini, faturalarını, istasyonlarını ve kullanıcılarını yönettiği portal.

Ayrıca tablet/telefon üzerindeki MES kiosk uygulamalarının lisans durumunu sorguladığı bir **Lisans Doğrulama API'si** geliştirilecektir. Kiosk uygulamasının kendisi bu projenin kapsamı DIŞINDADIR; yalnızca onun tüketeceği API sözleşmesi tanımlanır.

## 2. Teknoloji Yığını

Teknoloji seçimi geliştiriciye (Claude Code) bırakılmıştır. Aşağıdaki kısıtlara uyulmalıdır:

- Modern, tip güvenli bir stack (örn. Next.js/TypeScript veya eşdeğeri) tercih edilmeli.
- Veritabanı ilişkisel olmalı (PostgreSQL önerilir); tüm tablolar multi-tenant tasarlanmalı (`tenant_id` izolasyonu).
- Ödeme altyapısı **Stripe** olacak (Subscriptions + Checkout + Customer Portal + Webhooks).
- **i18n altyapısı baştan kurulacak** (örn. next-intl / i18next). Varsayılan dil İngilizce; TR/DE çevirileri sonradan eklenebilecek şekilde tüm UI metinleri çeviri dosyalarında tutulmalı, hard-coded metin olmamalı.
- Para birimi: USD. Tarih/saat: UTC saklanır, kullanıcı saat diliminde gösterilir.

## 3. Lisans Paketleri

| Paket | Aylık Ücret | İstasyon/Kiosk Limiti |
|---|---|---|
| Basic | $100 | 5 istasyon |
| Pro | $200 | 10 istasyon |
| Premium | $300 | Sınırsız |

- Faturalama **aylık**, istasyon başına değil **paket başına sabit** ücrettir.
- Paket yükseltme anında geçerli olur ve Stripe **proration** ile fark tahsil edilir.
- Paket düşürme bir sonraki fatura döneminde geçerli olur; düşürme sırasında aktif istasyon sayısı yeni limitin üzerindeyse, müşteri fazla istasyonları devre dışı bırakmadan düşürme tamamlanamaz (UI bu akışı yönetmeli).

## 4. Deneme (Trial) Kuralları

- **30 günlük ücretsiz deneme**, kayıt sırasında **kredi kartı zorunludur**.
- Stripe subscription `trial_period_days: 30` ile oluşturulur; 30. gün sonunda **otomatik ücretlendirme** başlar.
- Deneme sırasında seçilen paketin tüm özellikleri ve istasyon limiti geçerlidir.
- Denemenin bitişine 7 gün ve 1 gün kala müşteriye e-posta bildirimi gönderilir.
- Deneme sonunda kart tahsilatı başarısız olursa doğrudan **PAST_DUE** akışına girilir (bkz. Bölüm 5).
- Aynı şirket/alan adı için tekrar deneme açılması admin onayı gerektirir (kötüye kullanım koruması).

## 5. Lisans Yaşam Döngüsü (Durum Makinesi)

```
TRIALING ──(30 gün, ödeme başarılı)──► ACTIVE
TRIALING ──(ödeme başarısız)─────────► PAST_DUE
ACTIVE ───(yenileme ödemesi başarısız)► PAST_DUE
PAST_DUE ─(3 gün içinde ödeme)───────► ACTIVE
PAST_DUE ─(3 gün dolunca)────────────► SUSPENDED
SUSPENDED ─(ödeme yapılırsa)─────────► ACTIVE
ACTIVE/TRIALING ─(müşteri iptali)────► CANCELED (dönem sonunda)
SUSPENDED ─(90 gün ödeme yok)────────► CANCELED
```

### 5.1 PAST_DUE (Ek Süre / Grace Period — 3 gün)

- Ödeme başarısız olduğunda sistem **3 gün ek süre** tanır.
- Bu süre boyunca **sistem tam çalışmaya devam eder**: veri toplama, veri analizi ve kiosk arayüzleri normal işler.
- Portal ve kiosk arayüzünde kalıcı bir uyarı bandı gösterilir: "Ödemeniz alınamadı, X gün içinde ödeme yapılmazsa veri toplama durdurulacaktır."
- Stripe Smart Retries ile tahsilat yeniden denenir; her deneme günü e-posta bildirimi gider (dunning).

### 5.2 SUSPENDED (Askıya Alınmış)

3 günlük ek süre sonunda ödeme alınamadıysa:

- **Veri toplama otomatik durdurulur:** Kiosklardan gelen üretim verisi kabul edilmez (API `403 LICENSE_SUSPENDED` döner).
- **Veri analizi otomatik durdurulur:** Zamanlanmış analiz/rapor işleri bu tenant için çalıştırılmaz.
- **Tablet/telefon uygulaması açılabilir** ancak anlık veri gösterilmez; uygulama "Lisans askıda — ödeme gerekli" ekranına düşer.
- **Müşteri portalında yalnızca ödeme/fatura ekranı erişilebilir kalır.** Dashboard, raporlar, istasyon yönetimi vb. tüm diğer sayfalar ödeme ekranına yönlendirilir.
- Müşteri verisi **silinmez**, yalnızca erişim kapatılır. Ödeme yapıldığı anda (webhook ile) hesap otomatik ACTIVE durumuna döner ve tüm veriye erişim geri gelir.

### 5.3 CANCELED

- Müşteri iptali dönem sonunda geçerli olur; dönem sonuna kadar hizmet devam eder.
- SUSPENDED durumda 90 gün ödeme yapılmazsa abonelik iptal edilir; veri 90 gün daha saklanıp ardından silme politikası uygulanır (GDPR uyumlu, silmeden önce e-posta ile bilgilendirme).

## 6. Lisans Doğrulama API'si (Kiosk Uygulamaları İçin)

Tablet/telefon MES uygulamalarının tüketeceği endpoint'ler:

- `POST /api/v1/license/heartbeat` — Cihaz kimliği + tenant token ile çağrılır. Yanıt: lisans durumu (`TRIALING | ACTIVE | PAST_DUE | SUSPENDED | CANCELED`), paket, istasyon limiti, grace bitiş zamanı.
- `POST /api/v1/data/ingest` — Üretim verisi kabulü. Lisans SUSPENDED/CANCELED ise `403 LICENSE_SUSPENDED` döner ve payload işlenmez.
- **Çevrimdışı tolerans:** Kiosk, son başarılı heartbeat'ten itibaren en fazla **72 saat** önbelleklenmiş lisans durumu ile çalışabilir. 72 saat sonra sunucuya ulaşamıyorsa salt-okunur moda düşer (spec'i kiosk ekibi için API dokümantasyonuna ekle).
- Heartbeat aynı zamanda **aktif istasyon sayımı** için kullanılır: limit aşımında yeni cihaz aktivasyonu reddedilir (`409 STATION_LIMIT_EXCEEDED`).

## 7. Stripe Entegrasyonu

- **Ürünler/Fiyatlar:** 3 Product (Basic/Pro/Premium), her biri aylık recurring Price (USD). Fiyat ID'leri env config'de tutulur.
- **Kayıt akışı:** Stripe Checkout Session (mode: subscription, `trial_period_days: 30`, kart zorunlu).
- **Müşteri self-servis:** Kart güncelleme ve fatura geçmişi için Stripe Customer Portal entegre edilir; ayrıca uygulama içinde fatura listesi gösterilir (Invoice API).
- **Dinlenecek webhook'lar (minimum):**
  - `checkout.session.completed` → tenant + abonelik kaydı oluştur
  - `customer.subscription.updated` → durum/paket senkronizasyonu
  - `customer.subscription.deleted` → CANCELED işaretle
  - `invoice.paid` → ACTIVE'e döndür, dönem tarihlerini güncelle
  - `invoice.payment_failed` → PAST_DUE başlat, grace sayacını kur (3 gün)
- Webhook imza doğrulaması zorunlu; işlemler idempotent olmalı.
- Grace süresinin dolması bir **zamanlanmış iş (cron/scheduler)** ile kontrol edilir: `past_due_since + 3 gün < now` ise SUSPENDED'a geçir, veri toplama bayrağını kapat, bildirim gönder.

## 8. Roller ve Yetkiler

| Rol | Kapsam | Yetkiler |
|---|---|---|
| `PLATFORM_ADMIN` | Tüm tenant'lar | Her şey: müşteri CRUD, lisans müdahalesi, deneme uzatma, manuel askıya alma/açma, ücretsiz (comp) lisans, MRR raporları |
| `PLATFORM_SUPPORT` | Tüm tenant'lar | Salt-okunur müşteri görünümü + destek notları |
| `CUSTOMER_OWNER` | Kendi tenant'ı | Abonelik/paket yönetimi, ödeme yöntemi, kullanıcı ve istasyon yönetimi |
| `CUSTOMER_USER` | Kendi tenant'ı | Dashboard/rapor görüntüleme (abonelik ekranlarına erişemez) |

Kimlik doğrulama: e-posta + parola (güçlü parola politikası) ve e-posta doğrulaması. Oturum yönetimi güvenli (httpOnly cookie / JWT). Admin panel ayrı route grubunda (`/admin`) ve rol kontrolü middleware ile yapılır.

## 9. Admin Panel — Ekranlar

1. **Dashboard:** Toplam müşteri, aktif/deneme/askıda dağılımı, MRR, churn, bu ay biten denemeler listesi.
2. **Müşteri Listesi:** Arama + filtre (durum, paket, ülke). Kolonlar: şirket, paket, durum, istasyon kullanımı (örn. 4/5), sonraki fatura tarihi, MRR katkısı.
3. **Müşteri Detayı:** Abonelik geçmişi, fatura listesi, istasyon/cihaz listesi (son heartbeat zamanı ile), kullanıcılar, denetim kaydı, destek notları. Manuel aksiyonlar: deneme uzat, askıya al / askıyı kaldır, paket değiştir, comp lisans tanımla — her aksiyon gerekçe alanı ile audit log'a yazılır.
4. **Faturalar:** Stripe fatura durumları, başarısız tahsilatlar (dunning kuyruğu).
5. **Sistem Ayarları:** Paket/fiyat eşlemeleri, grace gün sayısı (varsayılan 3, konfigüre edilebilir), bildirim şablonları.

## 10. Müşteri Portalı — Ekranlar

1. **Kayıt / Onboarding:** Şirket bilgileri → paket seçimi → Stripe Checkout (kart + 30 gün deneme) → ilk istasyon aktivasyon kodu üretimi.
2. **Abonelik Ekranı:** Mevcut paket, istasyon kullanımı, deneme/dönem bitiş tarihi, yükselt/düşür butonları, iptal akışı (dönem sonu bilgilendirmesi ile).
3. **Fatura & Ödeme:** Fatura geçmişi (PDF indirme), kart güncelleme (Stripe Customer Portal linki). **SUSPENDED durumda erişilebilir kalan tek ekran budur.**
4. **İstasyon Yönetimi:** Cihaz listesi, aktivasyon kodu üretme, cihaz devre dışı bırakma, son heartbeat durumu.
5. **Kullanıcı Yönetimi:** Kullanıcı davet etme, rol atama.
6. **Durum Bantları:** TRIALING → "Denemenizin bitmesine X gün var"; PAST_DUE → kırmızı geri sayım bandı; SUSPENDED → tam sayfa ödeme yönlendirmesi.

## 11. Bildirimler (E-posta)

- Deneme başlangıcı (hoş geldin), deneme bitişine 7 gün / 1 gün kala.
- Ödeme başarılı (fatura eki), ödeme başarısız (grace başladı), grace 1. ve 3. gün hatırlatmaları.
- Askıya alındı bildirimi, yeniden aktifleşme onayı, iptal onayı.
- Tüm şablonlar i18n uyumlu; gönderim sağlayıcısı soyutlanmalı (örn. Resend/SES adapter).

## 12. Fonksiyonel Olmayan Gereksinimler

- **Multi-tenancy:** Tüm sorgular tenant scope'lu; tenant'lar arası veri sızıntısı testlerle doğrulanmalı.
- **Audit log:** Lisans durumu değişimleri, admin müdahaleleri, ödeme olayları değiştirilemez kayıt olarak tutulur (kim, ne zaman, ne, gerekçe).
- **Güvenlik:** Webhook imza doğrulama, rate limiting (özellikle license API), OWASP temel kontrolleri, parolalar bcrypt/argon2.
- **GDPR:** Veri silme talebi akışı, veri saklama politikası (Bölüm 5.3), kişisel verilerin minimizasyonu.
- **Gözlemlenebilirlik:** Yapılandırılmış loglama; lisans durum geçişleri ve webhook hataları için uyarı mekanizması.

## 13. Kapsam Dışı

- Kiosk/tablet MES uygulamasının kendisi (yalnızca API sözleşmesi bu projede).
- ERP/IoT entegrasyonları (ürün stratejisi gereği kapsam dışı).
- Yıllık faturalama, bayi/reseller komisyon modülü, kullandıkça öde (ileriki fazlar).

## 14. Kabul Kriterleri

1. Yeni müşteri kartla kayıt olup 30 gün deneme başlatabiliyor; 30. gün Stripe otomatik tahsilat yapıyor.
2. Tahsilat başarısız olduğunda hesap PAST_DUE oluyor, sistem 3 gün tam çalışıyor, uyarı bandı görünüyor.
3. 3. günün sonunda hesap otomatik SUSPENDED oluyor: ingest API 403 dönüyor, zamanlanmış analizler duruyor, portalda yalnızca ödeme ekranı açık kalıyor.
4. SUSPENDED müşteri ödeme yaptığında webhook ile saniyeler içinde ACTIVE'e dönüyor ve veri akışı kaldığı yerden devam ediyor.
5. Basic pakette 6. istasyon aktivasyonu `409 STATION_LIMIT_EXCEEDED` ile reddediliyor; Premium'da limit yok.
6. Paket yükseltme anında + prorated, düşürme dönem sonunda uygulanıyor.
7. Admin bir müşterinin denemesini uzatabiliyor ve tüm müdahaleler audit log'da görünüyor.
8. Tüm UI metinleri çeviri dosyalarından geliyor; ikinci bir dil eklemek kod değişikliği gerektirmiyor.
