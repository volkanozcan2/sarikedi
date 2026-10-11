# SARIKEDİ Sunucusu

Dersleri SQLite'ta saklayan, `/api` ve `/uploads` yollarını sunan ve (isteğe bağlı) derlenmiş GUI'yi servis eden tek Node.js süreci.

## Hızlı başlangıç (geliştirme)

```bash
cd server && npm ci          # bağımlılıklar
printf %s "en az 10 karakterli şifre" | npm run hash-password --silent   # çıktıyı kopyala (şifre komut geçmişine yazılmaz)
ADMIN_PASSWORD_HASH='scrypt:...' SESSION_SECRET="$(openssl rand -hex 32)" node src/index.js
```

Geliştirmede `npm start` (kök dizin: `npm run server`) `http://127.0.0.1:3001` dinler; GUI dev sunucusu (`npm start`, 8601) `/api` ve `/uploads` isteklerini buraya vekiller.

## Ortam değişkenleri

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `PORT` | `3001` | Dinlenen port |
| `HOST` | `127.0.0.1` | Dinlenen adres (`0.0.0.0` dışarı açar) |
| `DATA_DIR` | `server/data` | `sarikedi.db` ve `uploads/` burada |
| `STATIC_DIR` | yok | Derlenmiş GUI klasörü (`scratch-gui/build`); verilirse `/` GUI'yi sunar |
| `SEED_DIR` | `server/seed` | Açılışta eklenen ders JSON'ları |
| `ADMIN_PASSWORD_HASH` | yok | `npm run hash-password` çıktısı (üretimde zorunlu) |
| `SESSION_SECRET` | yok | En az 32 karakter (üretimde zorunlu) |
| `NODE_ENV` | yok | `production`: güvenli çerez + vekil güveni açılır, eksik gizli bilgi başlatmayı engeller |
| `SECURE_COOKIES` / `TRUST_PROXY` | `NODE_ENV`'e bağlı | `1`/`0` ile elle geçersiz kılınır |

## Ders eklemek

1. **Panelden:** tarayıcıda `/?author` adresinden yazılır.
2. **JSON dosyasıyla:** ders JSON'unu `SEED_DIR`'e bırak ve sunucuyu yeniden başlat. Yeni kimlikli dersler eklenir; **var olan kimlikler ezilmez** (panelden yaptığın düzenlemeler korunur). Geçersiz dosyalar açılışta loglanır ve atlanır.

Panelden düzenlenmiş bir tohum dersi sıfırlamak ya da güncellenen tohum dersleri yayına almak için (var olan dersin üzerine yazar):

```bash
DATA_DIR=/srv/sarikedi/data npm run reseed -- yildiz-yakala labirent   # yalnızca bunlar
DATA_DIR=/srv/sarikedi/data npm run reseed -- --all                    # tohumdaki tüm dersler
```

`DATA_DIR` sunucunun kullandığı klasörle **aynı** olmalı (komut hangi veritabanını yazdığını başında yazdırır); aksi halde başka bir veritabanına yazılır ve canlı site değişmez.

Ders biçimi için `src/lib/lessons/schema.js` (doğrulayıcı) ve `server/seed/*.json` (örnekler) dosyalarına bak.

## Dağıtım (Ubuntu + systemd)

```bash
# derleme makinesinde
npm run build                # scratch-gui/build
# sunucuya: server/ (node_modules hariç) ve build/ klasörü
rsync -a --exclude node_modules --exclude data server/ sunucu:/srv/sarikedi/api/
rsync -a build/ sunucu:/srv/sarikedi/gui/
# sunucuda
cd /srv/sarikedi/api && npm ci --omit=dev
sudo cp deploy/sarikedi.service /etc/systemd/system/ && sudo systemctl daemon-reload
sudo systemctl enable --now sarikedi
```

`deploy/sarikedi.service` içindeki yolları düzenle. Gizli bilgiler (`ADMIN_PASSWORD_HASH`, `SESSION_SECRET`) birim dosyasına değil, yalnızca root'un okuyabildiği `/etc/sarikedi.env` dosyasına (mod 600) yazılır; birim dosyaları herkesçe okunur. HTTPS için `deploy/Caddyfile.example`.

Güvenlik notları:
- `TRUST_PROXY=1` (üretimde varsayılan) yalnızca `X-Forwarded-For` başlığını **ezen tek bir** ters vekilin (Caddy) arkasında güvenlidir. Vekilsiz ve `HOST=0.0.0.0` ile çalıştırırsan `TRUST_PROXY=0` ver, yoksa giriş hız sınırı atlatılabilir.
- Yönetici yazma istekleri `Origin` başlığını `Host` ile karşılaştırır; vekilin `Host` başlığını değiştirmemesi gerekir (Caddy varsayılanı uygundur; nginx'te `proxy_set_header Host $host;` ver).
- Çıkış (`/api/admin/logout`) tüm eski oturum çerezlerini iptal eder; şifreyi değiştirirsen `SESSION_SECRET`'i de değiştir.
- Silinen tohum dersler yeniden başlatmada geri gelmez. Bir tohum dersi geri almak için `seeded` tablosundan kimliğini sil.

Yedekleme: `DATA_DIR` klasörünü kopyalamak yeter (`sarikedi.db` + `uploads/`).
