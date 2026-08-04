# MES Müşteri Yönetim Platformu (KioskMES)

Kiosk tabanlı hafif MES ürününün ticari yönetim katmanı: Admin Panel + Müşteri
Portalı + **canlı MES demo modu**. Tam spesifikasyon: `docs/SPEC.md`.
Admin/portal hâlâ mock (`src/lib/data.ts`, sabit `NOW`); **MES tarafı
(`/mes/*`) gerçek zamanlı koşan demo**: Stripe, PostgreSQL, auth ve Lisans
API'si henüz bağlanmadı (sonraki faz).

## Demo modu mimarisi (MES tarafı)

- `src/lib/sim.ts` — **deterministik 7/24 simülasyon**: gerçek duvar saatine
  bağlı seeded RNG; 10 istasyon (`SIM_STATIONS`, her biri `MachineKind`:
  cutting/punching/bending/welding/assembly/quality/packaging), 3 vardiya + operatör
  havuzu, saatlik üretim/duruş/fire hücreleri, gün/aralık toplamları
  (`simDay` memoize'lu), aylara dönük tamamlanmış sipariş üretici
  (`completedOrders`), `performanceFor(range, now)`. Geçmiş raporlar buradan
  "bedavaya" gelir — saklanmaz, hesaplanır.
- `src/lib/server/demo-store.ts` + `/api/demo` — **dosya tabanlı canlı depo**
  (`data/demo-store.json`, gitignore'lu). GET her çağrıda `advance()` ile
  simülasyonu dakika dakika ilerletir (adet artışı, adım/sipariş tamamlama,
  otomatik duruş/andon, vardiya değişimi, gece yarısı sayaç sıfırlama, sipariş
  havuzunu ~40 açık siparişe doldurma; en fazla 7 gün catch-up). Tohumlama:
  `SEED_WIP` (30, rota boyunca yayılı WIP) + `SEED_BACKLOG` (18, bekleyen
  yığın) → 10 istasyon dolu başlar. Yığını değiştirdikten sonra
  `data/demo-store.json` silinmeli ya da `resetDemo` çağrılmalı (bellekteki
  depo aksi halde eski kalır). POST kullanıcı aksiyonlarını
  uygular (`DemoAction` union'ı `src/lib/demo-types.ts`'te). Yazma atomiktir
  (tmp+rename) — canlı yazarken bozuk JSON önbelleği oluşmaz.
- `src/components/demo/DemoProvider.tsx` — 4 sn'de bir GET poll + `dispatch`;
  tüm `/mes/*` sayfaları (ve `/admin/mes`) bu context'ten okur. **Butonların
  hepsi gerçek yazar**; telefon kiosku ile masaüstü panosu aynı depoyu görür.
- `src/lib/mes-calc.ts` — depo verisi üstünde saf hesaplar (ilerleme, plan
  performansı, iş yükü, pareto).
- **Para birimi:** ürün global — `settings.currency` (USD/EUR/TRY) yalnızca
  gösterim tercihi; maliyetler seçili birimde girilir, **kur dönüşümü YOKTUR**
  (`src/lib/currency.ts`). `/admin/mes`'ten seçilir.
- **Modül bayrakları** (`settings.features`, `/admin/mes`'ten aç/kapa):
  `maintenance` = planlı bakım takvimi (`/mes/manager/maintenance`, gecikmiş/
  7 gün içinde/ileri kovaları, "Yapıldı" → periyot kadar ileri atar; executive
  uyarısına gecikmiş sayısı düşer); `barcode` = operatör kioskunda barkod/QR
  ile iş başlatma (simüle edilmiş okuma modalı). **İzleme ekranları (TV/andon)
  hiçbir zaman lisansa tabi DEĞİLDİR** — ürün kuralı, admin'de not olarak da
  yazılıdır.
- **Paketler & özellik yetkilendirmesi** (`src/lib/types.ts` `PlanId` =
  `BASIC | AIPRO | AIULTIMATE`, `src/lib/data.ts` `PLANS`/`PLAN_ENTITLEMENTS`):
  **istasyon sayısı sınırı YOK** — fiyat yeteneğe bağlı. Basic ($199) tam MES;
  AI Pro ($299) = AI Asistan + sektör kıyası + gelişmiş analiz; AI Ultimate
  ("Fiyat sorunuz", çoklu tesis/API sadece pazarlama, backend yok).
  `settings.plan` canlı depoda tutulur (`/admin/mes`'ten `setPlan`), MES tarafı
  `useEntitlements()` (`DemoProvider`) ile kapılanır: asistan, performans
  karşılaştırması, öneri paneli ve uyarı merkezi **AI Pro+**'a (`advancedAnalytics`)
  bağlı; Basic'te `PlanUpsell` gösterilir.
- **Smart Manufacturing katmanı** (AI Pro): **konfigüre edilebilir uyarı/eskalasyon
  motoru** — `settings.escalationRules` (`EscalationRule`: `trigger`
  scrapRate/downtime, `threshold`, `target` supervisor/maintenance/quality,
  `enabled`), varsayılan merdiven fire>%5→üst amir, arıza>5dk→bakım, >30dk→üst
  amir. Motor `demo-store.ts` `evaluateAlerts` her dakika çalışır, `sourceKey`
  ile dedupe eder, `store.alerts` (`LiveAlert`) üretir; `ackAlert` onaylar,
  `saveEscalationRules` kaydeder. Kural tablosu hem `/admin/mes` hem
  `/mes/manager/settings`'te (`MesCatalogSettings`). **Uyarı Merkezi**
  `/mes/manager/alerts` (açık/onaylanan + nav rozeti). **Öneri motoru**
  `src/lib/insights.ts` (`plantInsights` = darboğaz/duruş nedeni/fire/geciken/
  denge; `rootCauseFor` = geciken siparişin nedeni) → `InsightsPanel` (genel
  bakış + executive + alerts) ve sipariş panosunda "Neden:" satırı. Taze tohum
  bir istasyonu 35 dk arızalı başlatır (merdiven ilk açılışta görünür).
- **Rol bazlı ekranlar** (hub `/mes`): Operatör, **Satış** (`/mes/sales`:
  sipariş girişi + tekliflendirme + boş kapasite), **Üretim Yönetimi**
  (`/mes/manager` — "müdür" ifadesi YOK, **parasal içerik YOK**), **Bakım**
  (`/mes/maintenance`: açık andon çağrıları + AI bakım eskalasyonları + planlı
  bakım), Üst Yönetim (`/mes/executive` — para burada), TV. **Departman ayarı**
  `settings.maintenanceOwnDepartment` (`/admin/mes`'ten): açıkken Bakım kendi
  ekranıdır ve üretim navigasyonunda görünmez; kapalıyken bakım Üretim
  Yönetimi içine katlanır (`MesManagerShell` `sharedDept` filtresi, hub karosu
  `dept` filtresi). `OrdersBoard` paylaşılır (`allowCreate`: Satış'ta oluşturma
  açık, Üretim'de salt-durum). `PlannedMaintenance` paylaşılır.
- **Kalıcı teklifler:** `store.quotes` (`SavedQuote`) + `saveQuote`/`deleteQuote`;
  Satış teklif sayfasında kaydet + **müşteriye göre aranabilir** liste; tohumda
  7 geçmiş teklif. **Boş kapasite** `insights.ts` `capacityOutlook(snap, days, now)`
  (operasyon başına planlı uygunluk vs bağlı yığın). **Çalışma takvimi**
  `settings.workingCalendar` (`WorkingCalendar`: `shifts` 1..3, `restDays`
  getUTCDay 0=Paz..6=Cmt) — müşteri MES ayarlarından girilir (`setWorkingCalendar`,
  `MesCatalogSettings` "Çalışma takvimi" kartı, paylaşılan); uygunluk = vardiya ×
  `HOURS_PER_SHIFT`(8) × çalışma günü (tatil günleri hariç). **Demo varsayılanı
  3 vardiya, tatil yok = 7/24.**
- **Asistan kapsamı** (`PlantAssistant` `scope`): Üretim = `"ops"` (para
  intentleri `MONEY_INTENTS` reddedilir → `opsNoMoney`, çipler operasyonel,
  LLM yönergesine para-hariç eki eklenir); GM/Satış = `"full"`. **Öneri motoru
  da LLM'e taşındı:** `/api/insights` anahtar varsa `claude-opus-4-8` ile 3
  doğal-dil öneri üretir, yoksa `503` → `InsightsPanel` yerel `plantInsights`
  sezgilerine düşer (LLM modunda "AI" rozeti). **Gerçek LLM için `.env.local`'e
  `ANTHROPIC_API_KEY` gerekir** (`.env.local.example` var); anahtar gelince
  asistan + öneriler otomatik gerçek LLM'e döner.
- `baslat.cmd` — çift tık: sunucu arka planda (yoksa) + tarayıcı otomatik
  açılır; masaüstünde "KioskMES Demo" kısayolu var.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 (`@theme` token'ları `src/app/globals.css` içinde)
- next-intl — locale routing yok; TR/EN/DE çözümü (`src/i18n/request.ts`):
  **`locale` çerezi varsa kazanır** (LanguageSwitcher yazar + `router.refresh()`),
  yoksa **Accept-Language** algılanır, son çare `en` (spec §2). **Tüm UI metinleri `src/messages/{en,tr,de}.json`'da**
  (spec kabul kriteri #8) — üç dosya aynı anahtar yapısını korumalı; yeni
  anahtar eklerken üçüne de ekle. Tarih biçimleri: `format.ts` fonksiyonları
  opsiyonel `locale` parametresi alır (MES sayfaları geçirir; admin/portal
  şimdilik en-US).
- lucide-react ikonları

## Çalıştırma

`npm run dev` (port 3000). Node PATH'te yoksa: `C:\Program Files\nodejs`.
`.claude/launch.json` bu yüzden cmd + PATH önekiyle çalışır.

## Yapı

- `src/lib/data.ts` — tüm mock veri + türetilmiş yardımcılar (MRR, grace,
  heartbeat durumu). **Sabit demo saati `NOW` (2026-07-07)** — ekran
  görüntüleri deterministik olsun diye; gerçek backend gelince kalkacak.
- `src/lib/types.ts` — lisans durum makinesi tipleri (TRIALING/ACTIVE/PAST_DUE/SUSPENDED/CANCELED)
- `src/components/ui.tsx` — Card, StatCard, StatusBadge, Table primitifleri
- `src/app/admin/*` — iç ekip paneli (koyu kenar çubuğu)
- `src/app/portal/*` — müşteri portalı; **tümü client component** çünkü
  `PortalState` context'inden demo lisans durumu okur
- `src/components/portal/PortalState.tsx` — kenar çubuğundaki "Preview license
  state" seçicisi; gerçek uygulamada tenant kaydından gelecek. SUSPENDED
  seçilince PortalShell fatura sayfası dışında her şeyi kilitler (spec §5.2).

## MES ekranları (`/mes/*`) — ürünün saha tarafı (canlı demo)

- **Kurgu:** Sipariş no = iş emri no, **otomatik SIP-YYYY-AA-NNN** (aylık
  sıfırlanır, `nextOrderNo()`). Siparişi giren kişi, ön tanımlı **operasyon
  kataloğundan** (`src/lib/mes-data.ts` `operations`) sırayla rota tanımlar.
  Her kiosk tek bir operasyona bağlıdır; operatör yalnızca kendi operasyonuna
  düşen işleri görür.
- **Nesting:** `OperationDef.batchable` (lazer/plazma/oksijen/kaynak) → tek
  işlemde birden çok iş emri ilerler; `MesStation.currentOrderIds` dizidir,
  operatör kuyruktan "Add to nesting" ile iş ekler.
- **Metrik OEE değil, etkin süre bazlı kullanım oranı** (`utilToday`):
  başlat/durdur + duruş kayıtlarından otomatik türetilir — operatöre ek giriş
  yükü bindirme kararı bilinçli. Fire girişi tek dokunuş sayaç, neden sorulmaz.
- **Performans kriteri = Plana & Kapasiteye Uyum** (parça sayısı DEĞİL):
  `mes-calc.ts` `adherenceRate(planPerf, util)` = (min(1,planPerf)+min(1,util))/2.
  Yönetici KPI (`kpiAdherence`), GM hero (`adherenceToday`), `performanceFor`
  (shift/operatör `adherence` alanı, operatörler uyuma göre sıralı) hep bunu
  kullanır; çıktı ikincil bilgi olarak kalır.
- **Sipariş revizesi:** `editOrder` aksiyonu (`OrdersBoard` "Düzenle" → prefilled
  `OrderModal`); başlık/malzeme her zaman düzenlenir. **Rota birleştirmeli**:
  yalnız **tamamlanan/başlamış adımlar (done/running/paused/runMinutes>0) kilitli**
  ve canlı durumları korunur (`byOp` eşleştirme); kalan rota sıralanabilir/
  çıkarılabilir, araya veya sona operasyon eklenebilir (`OrderModal` sıralı liste
  + yukarı/aşağı + ekle; store nothing-queued ise ilk açık adımı `queued` yapar).
  **Demo süreleri kısa:** `estimateMinutes`
  6–15 dk (≈0,1–0,25 sa) → adımlar hızlı biter, veri sürekli akar.
- **Teklif çıktısı:** Satış teklif sayfasında yazdır (mevcut + kayıtlı her teklif)
  — `openPrint` ayrı pencerede temiz HTML teklif üretir + `window.print`.
- **Tahmini süre & plan performansı:** Rota adımlarında `estMinutes`
  (sipariş girişinde planlayıcı girer, saat cinsinden UI) ve `actualMinutes`
  (adım bitince otomatik). `planPerformance()` = tahmini ÷ gerçekleşen
  (>%100 = plandan hızlı); `workloadByOperation()` = operasyon başına kalan
  tahmini iş yükü (kapasite kartı, manager overview).
- **Maliyet:** `costRates` + `plantCostToday()` (işçilik/enerji/gaz/genel
  gider) → executive'de günlük maliyet + parça başı maliyet. Oranlar
  `/admin/mes`'ten girilir.
- **Ciro/kâr/kayıp:** `settings.billingRates` = istasyon-saat başına piyasa
  satış ücreti (`/admin/mes` tablosu, `DEFAULT_BILLING_RATES`). `src/lib/revenue.ts`
  `plantEconomics()` → ciro (faturalanabilir çalışma saati × ücret), maliyet,
  kâr/marj, **kaybedilen kazanç** (duruş saati × ücret = satamadığın kapasite).
  Executive'de iki kart; asistanda `revenue`/`lostRevenue` intentleri; LLM
  bağlamında da var. Executive + asistan aynı `plantEconomics`'i paylaşır.
- **Tekliflendirme modülü** (`settings.features.quoting`, `/admin/mes`'ten aç/kapa):
  `/mes/manager/quote` — operasyon+saat satırları × istasyon ücreti + malzeme +
  marj → teklif toplamı & parça başı fiyat. `operationBillingRate()` operasyona
  bağlı istasyonların ortalama ücretini alır. Kalıcı değil (hesap makinesi).
- **Metal işleme konsepti (hibrit):** ürün "sac metal" değil **metal işleme
  atölyesi**. `MachineKind` talaşlıyı içerir (sawing/turning/milling/drilling);
  operasyonlar Şerit Testere/CNC Torna/CNC Freze/Matkap + sac ops (lazer/abkant/
  kaynak…), 16 istasyon (6 talaşlı). Part havuzu mil/flanş/burç/dişli göbeği gibi
  talaşlı parçalar içerir. Pazarlama/terminoloji "Metal işleme atölyeleri".
- **Hammadde stok & tüketim** (`settings.features.stock`, `/admin/mes`'ten aç/kapa;
  hub'da **Depo** karosu, `/mes/stock`): `store.stock` (`StockItem`, **birim-duyarlı**
  `unit: "kg" | "piece"` — çubuk/blok/boru **kg**, **sac metal adet** ile
  `thicknessMm`+`dimension`(ölçü)+`weightKgPerPiece`; `onHand`/`reorder` birime göre;
  `stockWeightKg()` değer/KPI için ağırlığa çevirir), `store.stockMoves`
  (`StockMove`: issue/receipt/remnant/adjust, `qty` birime göre). **Backflush:**
  sipariş ilk adımı tamamlanınca `issueMaterial` stoktan düşer (çubuk **önce artığı**
  kullanır + ~%8 artık iade; sac **tam levha/adet** tüketir), `assignOrderMaterial`
  siparişe stok kalemi + `materialQty` bağlar (talaşlı→çubuk kg, sac→levha adet≈qty/30).
  **Sipariş ekranında "Tüketilecek: {malzeme} · {qty} {birim}"** satırı (`OrdersBoard`
  `consumed()`). **Kritik stok** (`onHand ≤ reorder`) → `evaluateAlerts` `lowStock` uyarısı
  (birim-duyarlı, `reasonId`=stok kalemi id),
  hedef **satın alma** (yeni `AlertTarget "purchasing"` + `AlertTrigger "lowStock"`,
  `LiveAlert.label` malzeme adını taşır). Aksiyonlar `restockItem` (giriş),
  `adjustStock`. Tohumda 2 kalem kritik (uyarı ilk açılışta görünür).
- **Fire/Hurda yönetimi:** `settings.scrapReasons` (`ScrapReason` katalog) +
  `store.scrapEvents` (`ScrapEvent`: neden + adet + **ağırlık kg**, siparişin stok
  kaleminden parça ağırlığı). Tick'te fire olunca `recordScrap` neden+ağırlık kaydeder;
  `mes-calc.ts` `scrapByReasonToday/scrapByStationToday/scrapTotalsToday/scrapCostToday`.
  **`ScrapPanel`** (neden pareto + kg/adet toplam): Üretim'de **maliyetsiz**, GM'de
  `withCost` (fire maliyeti = ağırlık × ort. malzeme fiyatı + işçilik kaybı).
- **0–1000 Performans Skoru** (`src/lib/score.ts` `plantScore`): 9 ağırlıklı faktör
  (üretkenlik/teslimat/kalite/kullanım/operatör/arıza/kapasite/plana uyum/bakım),
  `bandOf` (weak/fair/good/excellent), `weakestFactors` → AI iyileştirme ipuçları.
  **`PerformanceScore`** SVG yay göstergesi + faktör kırılımı + ipuçları — **GM
  ekranı hero**. Sürekli güncellenir (snapshot'tan saf hesap).
- **Rozet sistemi** (`src/lib/badges.ts` `plantBadges`): Günün/Haftanın/Ayın
  Operatörü (`performanceFor` uyum), Sıfır Gecikme, En Düşük Fire, En İyi Teslimat,
  En İstikrarlı Kalite, En Hızlı Operasyon; her rozet **holder + active**.
  **`BadgesStrip`** (`dark` TV varyantı, aktif=altın) → **TV** (ilk 4), **Üretim
  Yönetimi**, **GM**.
- `src/lib/mes-types.ts` + `mes-data.ts` — MesOrder/RoutingStep/MesStation,
  duruş & andon katalogları, kullanım/çıktı/maliyet trendleri. Katalog adları
  (operasyon, duruş nedeni, istasyon) tenant verisi sayılır → Türkçe mock;
  UI metinleri yine `en.json`'da.
- `src/components/mes/MesCatalogSettings.tsx` — operasyon + duruş nedeni
  yönetimi **hem `/admin/mes` hem `/mes/manager/settings`'te** (paylaşılan
  bileşen); maliyet oranları yalnız admin tarafında (`withCosts`).
- `/mes/operator` — kiosk (koyu tema, büyük dokunmatik hedefler): iş
  başlat/duraklat/bitir, adet, fire, duruş nedeni, andon. Tablet + telefon
  responsive. **Makine tipine göre mod**: kesim=nesting çoklu sayaç,
  kalite=büyük Kabul/Ret, paketleme=Paketlenen+Sevkiyata hazır, diğerleri
  tek iş sayacı. İstasyon seçici üstte.
- `/mes/manager/reports` — 7/30/90 gün geçmiş: günlük çıktı/kullanım
  grafikleri, günlük döküm tablosu, nedene göre duruş, tamamlanan siparişler.
- `/mes/tv` — saha ekranı için tam ekran canlı andon panosu (9 istasyon
  karosu + andon şeridi + saat).
- `/mes/manager` — üretim müdürü: canlı istasyon grid'i, andon akışı, duruş
  paretosu, OEE trendi; `/mes/manager/orders` liste + rota kurucu modal +
  `[id]` rota zaman çizelgesi. Masaüstünde üst nav, mobilde alt sekme çubuğu
  (responsive tek kod).
- `/mes/executive` — GM özeti: kullanım + çıktı + plan perf. hero kartları,
  maliyet, **sebep kırılımlı duruş maliyeti** (`downtimeTodayByReason` +
  `downtimeCostPerHour` = duran saat × işçilik), uyarılar, trendler.
  Nabız/Performans/**Asistan** sekmeleri (`ExecutiveTabs`).
- **Tesis asistanı / Smart Manufacturing Assistant** (`/mes/manager/assistant` +
  `/mes/executive/assistant`) — `PlantAssistant`. **Hibrit**: istemci önce
  `POST /api/assistant` dener; anahtar yoksa route `503 {mode:"local"}` döner →
  istemci `assistant-engine.ts` yerel motoruna düşer. **LLM modu**
  (`ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN` env varsa): `claude-opus-4-8`,
  adaptive thinking. Sistem yönergesi bağlamı `smartSuggestions` (=`plantInsights`),
  `openEscalations` (=`store.alerts`), `lateOrderRootCauses` (=`rootCauseFor`),
  `performanceScore` (=`plantScore`, faktör puanları + en zayıflar; "skoru nasıl
  artırırım" yanıtlanır) ile zenginleştirilmiştir; proaktif saha danışmanı gibi
  davranır. Yerel motorda `score` intenti (`tScore` deps) aynı bilgiyi verir. **ROI his olarak**:
  değeri yalnızca tesisin geri kazanılan kapasitesi / önlenen kaybı üstünden verir
  (kaybedilen kazanç, duruş) — **yazılımın fiyatıyla/aboneliğiyle asla kıyas yok,
  "kendini amorti eder" iddiası yok** (yönergede sıkı kural). **Yerel motor**:
  anahtar bazlı niyet eşleştirmesi (TR/EN/DE) — verimlilik, günlük/duruş maliyeti,
  duran makineler, bakım, çıktı, fire, iş yükü, andon, vardiya/operatör kıyası,
  termin riski, sipariş no (`SIP-...`), ciro/kaybedilen kazanç, **`bottleneck`
  (darboğaz), `suggestions` (öneriler), `alerts` (açık eskalasyonlar)**. Yeni üç
  intent `mes.insights`/`mes.alerts` çevirilerini `tInsights`/`tAlerts` deps ile
  kullanır (PlantAssistant geçirir). **Konu dışı sorular reddedilir**
  (`ON_TOPIC_KW` + `offtopic` → `mes.assistant.offtopic`). Yeni intent eklerken:
  RULES'a anahtar (kısa/çakışan hecelerden kaçın), `answerFor`'a case, üç dile
  mesaj, gerekirse `ON_TOPIC_KW` + LLM bağlamı. Öneri çipleri `SUGGESTION_INTENT`
  (q1..q6). Ret cümlesi hem yerel hem LLM'de üç dilde senkron kalmalı.
- **Performans karşılaştırması** — `PerformanceComparison` bileşeni hem
  `/mes/manager/performance` hem `/mes/executive/performance`'ta. 6 zaman
  aralığı (`performanceFor(range)`, mes-data): vardiya, operatör, anonim
  sektör kıyası (tesis vs sektör ort. vs en iyi %25). Sektör verisi gerçekte
  platform toplulaştırmasından gelecek (anonimlik notu UI'da).
- `src/components/charts/TrendChart.tsx` — 1-2 serili genel çizgi grafiği.
  **`format` fonksiyonu değil `unit` prop'u alır** (RSC sınırından fonksiyon
  geçmez); yeni birim gerekirse prop'a ekle.

## Tasarım kuralları

- Renk token'ları dataviz referans paletinden: accent #2a78d6, status renkleri
  (good/warning/critical) yalnızca durum için — seri rengi olarak kullanma.
- Grafikler: tek seri = legend yok, uç nokta etiketi + hover tooltip;
  bar/segment aralarında 2px yüzey boşluğu.
