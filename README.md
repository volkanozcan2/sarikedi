# SARIKEDİ

Scratch 3 editörünün Türkçe açılan, derslerle birlikte gelen hali. Öğretmenlerin ve öğrencilerin Scratch ile
oyun yapmayı adım adım öğrenebilmesi için hazırladım. Ders açılınca altta bir adım kartı çıkıyor, bir el hangi
düğmeye basacağını, hangi bloğu nereye koyacağını gösteriyor ve öğrenci doğru yaptığında adım kendiliğinden geçiyor.

Canlı hali: https://sarıkedi.com

Bu proje [scratch-gui](https://github.com/scratchfoundation/scratch-gui) üzerine kurulu bir fork. Scratch'in kendi
koduna dokunmadığım yerler olduğu gibi duruyor, benim eklediklerim şunlar:

- Varsayılan dil Türkçe, menü ve logo SARIKEDİ'ye göre değişti, varsayılan kukla "Cool Cat"
- **Dersler** menüsü: öğretmen editörde yaptıklarını kaydederek ders hazırlıyor, öğrenci de aynı adımları el
  rehberiyle kendisi yapıyor
- Öğretmen ve öğrenci hesapları, sınıflar, projeyi hesaba kaydetme ve sınıfla paylaşma
- Bunları saklayan küçük bir Node.js sunucusu (`server/`, SQLite)
- Hazır bir ders: arayüzü baştan sona gezdiren "SARIKEDİ'yi tanıyalım" (`server/builtin-lessons/`)
- Yeni görünüm, arayüz sesleri, Türkçe harf kuklaları ve açılış ekranı

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

   Sunucu `http://127.0.0.1:3001` adresinde açılır. Açılışta `server/builtin-lessons/` klasöründeki hazır
   dersleri veritabanına ekler.

6. Başka bir terminal açıp editörü başlat (proje klasöründe):

   ```bash
   NODE_OPTIONS=--openssl-legacy-provider npm start
   ```

   Tarayıcıda `http://localhost:8601` adresini aç. Menüdeki **Dersler** düğmesinden bir ders seçebilirsin.

7. Yönetici paneli için `http://localhost:8601/?author` adresine git, sağ üstteki **Yönetici** düğmesine bas ve 4.
   adımda belirlediğin şifreyle giriş yap. Panelde öğretmen hesaplarını onaylarsın.

## Ders hazırlamak

1. Sitede öğretmen olarak kaydol, yönetici panelinden hesabını onayla.
2. Menüde **Dersler**'e gir, **Yeni ders kaydet**'e bas. O an açık olan proje dersin başlangıcı olur.
3. Editörde normal çalış: blok koy, değer değiştir, kukla/dekor/ses/eklenti ekle, sekme değiştir. Hepsi adım adım
   kaydedilir. Üstteki şeritten not da ekleyebilirsin.
4. **Bitir**'e basınca adımların listesi açılır. Metinleri değiştir, sırayı düzenle, gereksiz adımları sil,
   dersin herkese mi yoksa yalnızca bir sınıfına mı görüneceğini seç ve kaydet.

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
- Proje ve ders yüklemeleri 10 MB'a kadar çıkabilir, `client_max_body_size 12m;` gibi bir sınır koy.
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

`/data` klasörünü bir volume olarak bağla, yoksa konteyner silinince hesaplar, projeler ve dersler gider.
Docker kullanmayacaksan `server/deploy/` klasöründe bir systemd birim dosyası ve Caddy örneği var,
ayrıntılar `server/README.md` içinde.

`deploy.sh` benim kendi sunucuma gönderirken kullandığım betik. Sunucu adı ve yolları ortam değişkenleriyle
değişiyor (`DEPLOY_HOST`, `DEPLOY_DIR`, `DEPLOY_URL`), kendi düzenine göre uyarlayabilirsin.

## Hazır ders eklemek

Herkese açık, kimsenin silemediği dersler `server/builtin-lessons/` klasöründe duruyor. Her ders iki dosya:
adımları içeren `<ad>.json` ve başlangıç projesi `<ad>.sb3`. Sunucu her açılışta bu klasörü okur; yeni dersi
ekler, değişeni günceller, klasörden kaldırılanı siler.

## Testler

```bash
npm run test:unit      # editör tarafı
npm run test:server    # sunucu
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
