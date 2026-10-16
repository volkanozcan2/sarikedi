# SARIKEDİ sunucusu

Hesap, proje ve paylaşım API'sini (`/api`) sunan, SQLite kullanan ve (isteğe bağlı) derlenmiş GUI'yi servis eden tek Node.js süreci.

## Çalıştırma

```bash
cd server
npm install
DATA_DIR=./data ADMIN_PASSWORD_HASH=$(node scripts/hash-password.js <parola>) PORT=3001 node src/index.js
```

Ortam değişkenleri: `PORT`, `HOST`, `DATA_DIR`, `STATIC_DIR`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `SECURE_COOKIES`, `TRUST_PROXY`.
Üretimde (`NODE_ENV=production`) `ADMIN_PASSWORD_HASH` ve en az 32 karakterlik `SESSION_SECRET` zorunludur.

Veri `DATA_DIR` altındadır: `sarikedi.db` (hesaplar, projeler, paylaşım) ve `projects/` (proje dosyaları ve küçük resimler).

## Eski "Dersler" verisini silmek

Dersler özelliği kaldırıldı. Canlıdaki eski veriyi (ders tabloları ve yüklenen kapak/başlangıç projeleri) silmek için,
**önce yedek alıp** şunu çalıştır (`--yes` olmadan yalnızca ne silineceğini gösterir):

```bash
DATA_DIR=/data node scripts/drop-lessons.js          # deneme
DATA_DIR=/data node scripts/drop-lessons.js --yes    # gerçekten siler (geri alınamaz)
```
