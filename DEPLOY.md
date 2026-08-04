# KioskMES — İnternete Yayınlama (Vercel + Upstash)

Bu proje her Git push'unda otomatik olarak canlıya çıkacak şekilde hazırlandı.
Aşağıdaki adımları bir kez yaparsın; sonrası otomatik.

## 1) GitHub'a gönder (kod deposu)

1. [github.com](https://github.com) üzerinde hesap aç.
2. Yeni bir **boş repo** oluştur (README ekleme): örn. `kioskmes`.
3. Proje klasöründe (bu klasör) şunları çalıştır — `URL` yerine kendi repo adresini yaz:
   ```bash
   git remote add origin https://github.com/KULLANICI/kioskmes.git
   git branch -M main
   git push -u origin main
   ```
   (Git kimliğini soran çıkarsa GitHub kullanıcı adı + [Personal Access Token](https://github.com/settings/tokens) ile giriş yaparsın.)

## 2) Vercel'e bağla (site burada çalışır)

1. [vercel.com](https://vercel.com) → **Continue with GitHub** ile gir.
2. **Add New… → Project** → GitHub reposunu **Import** et.
3. Framework otomatik **Next.js** algılanır → **Deploy**. İlk yayın 1-2 dk sürer.
   (Site açılır ama demo verisi henüz paylaşılmaz — 3. adım onu çözer.)

## 3) Canlı demo deposunu ekle (Upstash Redis — ücretsiz)

1. Vercel'de projeye gir → **Storage** sekmesi → **Create Database** → **Upstash (Redis)** seç → oluştur.
2. Vercel bunu projeye **otomatik bağlar** ve `UPSTASH_REDIS_REST_URL` +
   `UPSTASH_REDIS_REST_TOKEN` env değişkenlerini kendisi ekler. Elle bir şey girmene gerek yok.

## 4) Yapay zekâ anahtarı (asistan + öneriler)

1. Vercel'de proje → **Settings → Environment Variables**.
2. `ANTHROPIC_API_KEY` = *(yeni oluşturduğun Anthropic anahtarı)* ekle → Save.
   > Not: Daha önce ifşa olan anahtarı [console.anthropic.com](https://console.anthropic.com)'dan
   > iptal edip yenisini oluştur; buraya yenisini yapıştır.

## 5) Yeniden yayınla

Env değişkenleri eklendikten sonra Vercel'de **Deployments → (son deploy) → Redeploy**
de (env'lerin devreye girmesi için). Bu kadar — site canlı ve paylaşılabilir.

---

### Bundan sonrası otomatik
Kodda her değişiklik `git push` ile GitHub'a gidince, Vercel saniyeler içinde yeni
sürümü otomatik yayınlar. Ayrı bir işlem yok.

### Nasıl çalışıyor (teknik not)
- Canlı demo deposu tek bir JSON blob'u. **Lokalde** `data/demo-store.json` dosyası,
  **bulutta** Upstash Redis anahtarı (`src/lib/server/kv.ts`). Kod hangisinin var
  olduğuna göre otomatik seçer (`useRedis`), ikisinde de aynı davranır.
- Site zaten mobil uyumlu (responsive) tasarlandı.
