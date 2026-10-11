# SARIKEDİ

Scratch 3 editörünün Türkçe açılan, derslerle birlikte gelen hali. Öğretmenlerin ve öğrencilerin Scratch ile
oyun yapmayı adım adım öğrenebilmesi için hazırladım. Sağ altta bir ders paneli açılıyor, hangi bloğu nereye
koyacağını el imleciyle gösteriyor ve öğrenci doğru yaptığında adımı kendisi geçiyor.

Canlı hali: https://sarıkedi.com

Bu proje [scratch-gui](https://github.com/scratchfoundation/scratch-gui) üzerine kurulu bir fork. Scratch'in kendi
koduna dokunmadığım yerler olduğu gibi duruyor, benim eklediklerim şunlar:

- Varsayılan dil Türkçe, menü ve logo SARIKEDİ'ye göre değişti, varsayılan kukla "Cool Cat"
- **Dersler** menüsü ve ders oynatıcı (adım adım rehber, blok kontrolü, ilerleme tarayıcıda saklanır)
- Dersleri saklayan küçük bir Node.js sunucusu (`server/`, SQLite)
- Tarayıcıdan ders yazmaya yarayan yönetici paneli (`/?author`)
- 12 hazır ders: yıldız yakalama, labirent, pong, platform oyunu ve diğerleri (`server/seed/`)

## Neler gerekiyor

- Node.js 20 veya daha yeni (Node 22 ile de denedim)
- npm
- Git

## Kurulum (kendi bilgisayarında denemek için)

1. Projeyi indir:

   ```bash
   git clone https://github.com/volkanozcan2/sarikedi.git
   cd sarikedi
   ```

2. Editörün bağımlılıklarını kur. İlk seferde biraz sürer:

   ```bash
   npm ci
   ```

3. Sunucunun bağımlılıklarını kur:

   ```bash
   cd server
   npm ci
   ```

4. Yönetici şifreni belirle. Şifre en az 10 karakter olmalı. Aşağıdaki komut şifrenin özetini yazdırır, şifrenin
   kendisi hiçbir yere kaydedilmez. Çıktıdaki `scrypt:...` satırını bir yere not al:

   ```bash
   printf %s "buraya-kendi-sifren" | npm run hash-password --silent
   ```

5. Sunucuyu başlat. `ADMIN_PASSWORD_HASH` yerine bir önceki adımda not ettiğin satırı yaz:

   ```bash
   ADMIN_PASSWORD_HASH='scrypt:...' SESSION_SECRET="$(openssl rand -hex 32)" node src/index.js
   ```

   Sunucu `http://127.0.0.1:3001` adresinde açılır. İlk açılışta 12 hazır dersi veritabanına ekler.

6. Başka bir terminal açıp editörü başlat (proje klasöründe):

   ```bash
   NODE_OPTIONS=--openssl-legacy-provider npm start
   ```

   Tarayıcıda `http://localhost:8601` adresini aç. Menüdeki **Dersler** düğmesinden bir ders seçebilirsin.

7. Yönetici paneli için `http://localhost:8601/?author` adresine git, sağ üstteki **Yönetici** düğmesine bas ve 4.
   adımda belirlediğin şifreyle giriş yap.

## Yönetici panelinde neler yapılır

- Ders ekleme, düzenleme, sıralama, silme ve yayına alma ("Gizli" olan dersler menüde görünmez)
- Dersi oyunu yaparak kaydetme: **Kaydı başlat**'a bas, oyunu Scratch'te yap, her adım bitince **Adımı kaydet**'e bas.
  Eklenen bloklar, kukla/dekor/kostüm/ses eklemeleri ve kukla seçimleri adım olur
- Hazır bir `.sb3` dosyasını derse çevirme: kuklalar ve sesler başlangıç projesi olur, bloklar adım adım bölünür
- Adım metni, ipucu, görsel, el rehberi ve kontrolleri elle düzenleme

Kaydettiğin dersin menüde görünmesi için **Yayında** kutusunu işaretlemeyi unutma.

## Canlıya almak

Editörü derle:

```bash
NODE_OPTIONS=--openssl-legacy-provider npm run build
```

Çıktı `build/` klasörüne yazılır. Sunucu bu klasörü de sunabilir (`STATIC_DIR`), yani tek bir Node süreci hem siteyi
hem API'yi çalıştırır. Üretimde şu ortam değişkenleri gerekir:

| Değişken | Açıklama |
|---|---|
| `NODE_ENV` | `production` |
| `HOST` | Docker içinde `0.0.0.0`, tek başına çalışıyorsa `127.0.0.1` |
| `PORT` | Varsayılan `3001` |
| `DATA_DIR` | Veritabanı ve yüklenen dosyalar burada tutulur, kalıcı bir klasör olmalı |
| `STATIC_DIR` | Derlenmiş editörün klasörü (`build/`) |
| `ADMIN_PASSWORD_HASH` | Yukarıda üretilen `scrypt:...` satırı |
| `SESSION_SECRET` | En az 32 karakter rastgele metin (`openssl rand -hex 32`) |
| `TRUST_PROXY` | Bir ters vekilin (nginx gibi) arkasındaysan `1` |

`ADMIN_PASSWORD_HASH` ve `SESSION_SECRET` gibi gizli bilgileri koda ya da repoya koyma. `.env` dosyasında veya
sunucunun ortam değişkenlerinde tut. Repoda hiçbir gizli bilgi yok.

Ters vekil kullanıyorsan (nginx, Caddy):

- `Host` başlığını olduğu gibi ilet. Yönetici istekleri `Origin` ile `Host`'u karşılaştırır, uyuşmazsa 403 döner.
- `X-Forwarded-For` başlığını istemcinin gerçek IP'siyle ez (giriş denemesi sınırı buna bakar).
- Yönetici `.sb3` yüklemeleri 20 MB'a kadar çıkabilir, `client_max_body_size 25m;` gibi bir sınır koy.
- Sitenin HTTPS üzerinden açıldığından emin ol, yönetici çerezi yalnızca HTTPS'te saklanır.

Docker ile çalıştırmak istersen basit bir `Dockerfile`:

```dockerfile
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ ./
COPY build /gui

RUN mkdir -p /data && chown -R node:node /data
ENV HOST=0.0.0.0 PORT=3001 DATA_DIR=/data STATIC_DIR=/gui
USER node
EXPOSE 3001
CMD ["node", "src/index.js"]
```

`/data` klasörünü bir volume olarak bağla, yoksa konteyner silinince dersler ve yüklenen dosyalar gider.
Docker kullanmayacaksan `server/deploy/` klasöründe bir systemd birim dosyası ve Caddy örneği var,
ayrıntılar `server/README.md` içinde.

`deploy.sh` benim kendi sunucuma gönderirken kullandığım betik. Sunucu adı ve yolları ortam değişkenleriyle
değişiyor (`DEPLOY_HOST`, `DEPLOY_DIR`, `DEPLOY_URL`), kendi düzenine göre uyarlayabilirsin.

## Yeni ders yazmak

En kolayı yönetici paneli. Kod ile yazmak istersen dersler `lessons/sources/` altında küçük dosyalar olarak
duruyor, her biri bir oyunun çözümünü bloklarla tarif ediyor. Sistem bu çözümden gerçek bir Scratch projesi
üretip her adımın kontrolünü o proje üzerinde deniyor:

```bash
node lessons/build.js              # server/seed/*.json dosyalarını üretir
node lessons/verify.js [ders-id]   # her adımın doğru çözümle geçtiğini, yanlış çözümle geçmediğini denetler
```

Ayrıntılar `lessons/README.md` dosyasında.

## Testler

```bash
npm run test:unit      # editör tarafı
npm run test:server    # sunucu
npm run test:lessons   # derslerin çözümlerini gerçek scratch-vm üzerinde doğrular
npm run test:lint      # eslint
```

## Lisans ve kaynaklar

Bu proje, Scratch Vakfı'nın [scratch-gui](https://github.com/scratchfoundation/scratch-gui) projesinin
değiştirilmiş bir kopyasıdır ve onun lisansıyla, **GNU Affero Genel Kamu Lisansı v3** ile dağıtılır (`LICENSE`).
Değiştirilmiş halini bir ağ üzerinden sunuyorsan kaynak kodunu kullanıcılara vermen gerekir, bu repo da
sarıkedi.com için bu işi görüyor.

"Scratch" adı ve logosu Scratch Vakfı'na aittir, bu proje onlarla bağlantılı ya da onlar tarafından onaylı
değildir (`TRADEMARK` dosyasına bak). Cool Cat ve diğer varsayılan görseller ve sesler Scratch ekibinindir ve
[CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) lisansıyla paylaşılır.
