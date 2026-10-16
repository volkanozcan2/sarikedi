# SARIKEDİ – Tasarım Devir Notları

Bu dosya, arayüz tasarımına (neobrutal tema) devam edecek kişi ya da yapay zekâ için yazıldı. Önce **1. Proje nedir**, sonra **4. Yapılan işler** ve **5. Kalan işler** bölümlerini oku.

## 1. Proje nedir

SARIKEDİ, Scratch GUI'nin (scratch-gui 5.3.0) Türkçe, öğretmen/öğrenci odaklı bir çatalıdır. Canlı site: https://sarıkedi.com (`xn--sarkedi-tfb.com`). Lisans AGPL-3.0.

Scratch'e eklenenler:
- **Hesaplar**: öğretmen (yönetici onaylı) ve öğrenci (sınıf koduyla) kaydı, giriş, projeleri hesaba kaydetme.
- **Paylaşılanlar**: galeri, beğeni, yorum, bildirme, öğretmen moderasyonu. Tek tıkla "Paylaş".
- **Yönetici paneli** (`/?author`): yalnızca öğretmen hesaplarının onayı ve yönetimi. (Dersler özelliği kullanıcı isteğiyle tamamen kaldırıldı; sıfırdan yeniden başlanacak.)
- Düzenle menüsünde **60 FPS**, **Akıcı hareket (ara değer)** ve **Arayüz sesleri** seçenekleri.

Teknik özet:
- Ön yüz: React 16, redux, webpack 5, CSS modülleri (postcss: `postcss-simple-vars`, `postcss-import`), jest 21 + enzyme.
- Blok motoru: `scratch-blocks` (Blockly türevi, kendi CSS'ini çalışma anında enjekte eder).
- Sunucu: `server/` (Node, Express, SQLite) – tasarım işini ilgilendirmez.
- Depo: `/Users/volkan/Desktop/sarı_kedi/scratch-gui`, dal `dersler`. (`git log` ile yapılan işlere bak.)

## 2. Çalıştırma

```bash
cd /Users/volkan/Desktop/sarı_kedi/scratch-gui
NODE_OPTIONS=--openssl-legacy-provider npm start      # arayüz: http://localhost:8601
# ayrı bir terminalde (giriş/paylaşım gerekiyorsa) API:
cd server && DATA_DIR=./data ADMIN_PASSWORD_HASH=$(node scripts/hash-password.js <yerel-parola>) PORT=3001 node src/index.js
```

- Arayüz sunucusu `/api` ve `/uploads` isteklerini `127.0.0.1:3001`'e yönlendirir.
- **`webpack.config.js` değişirse geliştirme sunucusunu yeniden başlat** (CSS/JS değişiklikleri kendiliğinden yüklenir).
- Yönetici paneli: `http://localhost:8601/?author`.

Kontroller:
```bash
npx eslint src --ext .js,.jsx          # lint (max-len 120, jsx-no-literals vb.)
npx jest test/unit                     # birim testleri (şu an 766 geçiyor, 2 atlanıyor)
```
Sunucu testleri: `npx jest test/server` (zaman zaman nadiren dalgalanır).

## 3. Çalışma kuralları (kullanıcının isteği)

- Kullanıcı **Türkçe** konuşur; yanıtlar Türkçe olsun.
- **Siteye (VPS'e) dağıtımı kullanıcı onaylamadan yapma.** Dağıtım `./deploy.sh` ile olur (GUI'yi derler, VPS'e yollar, konteyneri yeniden kurar). Docker/nginx/compose ayarlarına dokunma.
- Sırları (`.env`, parola, anahtar) asla depoya ya da GitHub'a koyma, çıktıya yazma.
- Commit'ler küçük ve geri alınabilir olsun (kullanıcı "olmazsa geri döneriz" dedi). Commit mesajları Türkçe.
- Kullanıcı, ayrıntılı ön tasarım (brainstorming) oturumlarından hoşlanmaz; gerçek bir sorun varsa kısa sor.
- Çalışma klasöründeki boş `ebpack.config.js` yanlışlıkla oluşmuş bir dosyadır, commit'leme (silebilirsin).

## 4. Tasarım dili ve yapılan işler (Aşama 1 – tamamlandı, commit'li)

### Hedef: neobrutal
- Krem zemin, **petrol yeşili mürekkep** çerçeveler (3–4 px), **sert ofset gölgeler** (blur yok), düz canlı vurgu renkleri.
- Üzerine gelince (hover) öğe yukarı-sola kayar ve gölgesi büyür; basınca (active) aşağı-sağa çöker, gölge sıfırlanır.
- Seçili öğeler sarı ya da pembe, basılı öğeler camgöbeği.
- Zemin **düz noktalı** (hareketsiz). Şekil/hareket yok (çocukların dikkatini dağıtmasın).
- Köşeler **kare** (`border-radius: 0`). Yuvarlak kalanlar: yalnızca yuvarlak aksiyon düğmeleri.
- Yazı tipleri: başlık **Archivo Black**, gövde **Space Grotesk** (500/700). Türkçe karakterler için `latin-ext` dosyaları dahil. Dosyalar `src/css/fonts/` içinde, tanımları `src/css/fonts.css` içinde; `src/playground/index.css` bunu içe aktarır. (Webpack varlık kuralına `woff2` eklendi.)

### Renk ve ölçü değişkenleri
`src/css/colors.css` ve `src/css/units.css` içinde (postcss-simple-vars, `$` ile kullanılır):

| Değişken | Değer | Kullanım |
|---|---|---|
| `$nb-ink` | `#184D47` | petrol yeşili çerçeve ve yazı |
| `$nb-shadow` | `#D9942D` | sıcak amber ofset gölgeler; çerçeveden ayrışır |
| `$nb-paper` | `#FFF9E6` | krem zemin (`$ui-primary` de bu) |
| `$nb-paper-dark` | `#EFE4BD` | pasif sekme (`$ui-tertiary`) |
| `$nb-yellow` | `#FFD447` | marka rengi; menü çubuğu, seçili sekme, hover |
| `$nb-pink` | `#FF9A80` | mercan; seçili öğe, hover, odak gölgesi |
| `$nb-cyan` | `#62D3B4` | nane; basılı (active) durum |
| `$nb-green` | `#9DDB73` | yeşil bayrak hover |
| `$nb-lilac` | `#FFB85C` | sıcak turuncu; eklenti ve sert gölgeler |
| `$nb-dot` | `rgba(24,77,71,.16)` | zemin noktaları |
| `$ui-white` | beyaz | kart/panel zemini |
| `$font-body`, `$font-heading` | font yığınları | `units.css` |

Eski değişkenler yeniden tanımlandı: `$ui-primary`, `$ui-secondary`, `$ui-tertiary`, `$text-primary`
(artık petrol yeşili). `$stage-standard-border-width` 3px yapıldı. Blockly'nin doğrudan çizdiği
blok kategori renkleri çocukların blokları tanıması için korunuyor; arayüzdeki eski mavi/mor
destek renkleri ise petrol, mercan ve sıcak turuncu ailesine taşındı.

Referans görsel dil: `../blok-tanitim` ve `../balon-video` Remotion projeleri (`src/theme.ts`, `src/ui.tsx`, `src/Background.tsx`) aynı tasarım dilini kullanır; stil kararları için oraya bakabilirsin.

### Aşama 1'de değişen dosyalar
- Tema: `src/css/{colors,units,fonts}.css`, `src/playground/index.css`, `webpack.config.js` (woff2).
- Menü çubuğu: `components/menu-bar/{menu-bar,project-title-input,author-info}.css` (sarı çubuk, alt çizgi, hover pembe/active camgöbeği).
- Menüler: `components/menu/menu.css`, `components/context-menu/context-menu.css`.
- Ana iskelet: `components/gui/gui.css` (noktalı zemin, sekmeler, boşluklar, eklenti düğmesi).
- Sahne ve paneller: `stage/stage.css`, `stage-header/stage-header.css`, `sprite-info/sprite-info.css`, `sprite-selector/*`, `sprite-selector-item/*`, `stage-selector/*`, `target-pane`.
- Düğmeler: `button/button.css`, `toggle-buttons`, `delete-button`, `green-flag`, `stop-all`, `action-menu/action-menu.css` (yuvarlak ekle düğmeleri + ipuçları), `forms/input.css`, `account/account.css` (Giriş/Kaydol hapları).
- Blok çalışma alanı: `components/blocks/blocks.css` (çerçeve, noktalı zemin, kategori sütunu, flyout; Blockly'nin genel sınıfları `:global(...)` ile).
- Ses: `src/lib/ui-sounds.js` (+ `ui-sounds/click.wav`, `snap.wav`), `containers/ui-sounds-toggle.jsx`, Düzenle menüsünde açma/kapama, `playground/render-gui.jsx`'te `initUiSounds()`.
  - Menü ve düğme tıklaması → `click`; sekme, kukla seçimi, kategori sütunu → `snap`.
  - Blok çalışma alanı ve sahnede ses yok (projenin kendi sesleriyle karışmasın). Yalnızca flyout düğmeleri ve Blockly menü öğeleri hariç.
  - Testler: `test/unit/lib/ui-sounds.test.js`.
  - Blok çalışma alanına başarıyla bırakılan bloklarda `END_DRAG` olayı üzerinden yeşil bayrak ve
    durdur düğmesiyle aynı `click` sesi çalar; alan dışına bırakılan bloklarda çalmaz.

## 5. Aşama 2 ilerlemesi ve kalan işler

### Aşama 2'de tamamlananlar

- Temel modal sistemi neobrutal dile geçirildi: koyu perde, lacivert çerçeve, sert gölge, sarı başlık,
  Archivo Black başlık ve Space Grotesk gövde. Kapat/geri düğmeleri aynı etkileşim diline alındı.
- Hesap pencereleri (Giriş, Kaydol, Projelerim, Paylaşılanlar, Paylaş ve öğretmen sınıfları) ile
  form alanları, kartlar, bildirimler ve eylem düğmeleri neobrutal temaya uyarlandı.
- Kukla/dekor/kostüm/ses/uzantı kütüphanelerinin ortak kart, arama ve etiket bileşenleri
  kalın çerçeve, sert gölge ve sarı/pembe/camgöbeği durum renkleriyle birleştirildi.
- Ders paneli ve yönetici panelinin ana yapısı, formları, sekmeleri, durum kutuları ve kayıt çubuğu
  temaya hizalandı.
- Menü çubuğundaki hesap düğmeleri mutlak konumdan normal flex akışına alındı; 1024 px genişlikte
  üst üste binme giderildi ve tarayıcıda doğrulandı.
- `prompt`, `slider-prompt`, silme onayı ve alt uyarıların ortak görsel dili yenilendi.
- Kostüm editörünün `scratch-paint` paketinden gelen eski açık gri/mor kabuğu, paketi çatallamadan
  kararlı CSS sınıf önekleri üzerinden temaya bağlandı. Tuval, araçlar, giriş ve seçim durumları yenilendi.
- Ses editörü, dalga biçimi ve varlık paneli kalın lacivert çerçeve, krem zemin, pembe dalga ve sert
  gölgelerle yenilendi.
- Donanım/telemetri/kayıt/tarayıcı/WebGL/debug pencereleri ile eğitim kartları, yedek çanta,
  soru kutusu, özel blok penceresi ve monitor göstergeleri kaynak düzeyinde neobrutal dile geçirildi.
- Hakkında penceresindeki eski mor zeminli logo, şeffaf SARIKEDİ logosuyla değiştirildi.
- Ana renk paleti SARIKEDİ sarısı etrafında yenilendi: siyaha yakın lacivert yerine petrol yeşili,
  mavi-mor vurgular yerine mercan, nane ve sıcak turuncu kullanılıyor. Kukla/dekor/kostüm/ses
  ekleme menülerinin kontur ve ikonları da petrol yeşiline, sert gölgeleri sıcak turuncuya geçirildi.
- Giriş/Kaydol kontrolleri ana menüye yaklaştırıldı ve ikonları normal durumda görünür hale getirildi;
  sekme hover'ında oluşan alt boşluk kapatıldı. Bayrak/durdur aralığı açıldı, petrol konturlu kart
  gölgeleri amber rengine ayrıştırıldı ve kukla/dekor ekleme düğmelerinin arka diskleri küçültüldü.

### 15 Ekim 2026 görsel denetim skoru

Puanlama; görsel tutarlılık, okunabilirlik, durum/etkileşim netliği ve taşma/yerleşim ölçütlerinin
ortalamasıdır. 7/10 altı alanlar aynı turda yenilenip yeniden puanlandı.

| Alan | İlk | Son | Not |
|---|---:|---:|---|
| Ana editör + sahne | 8,5 | 8,5 | Tutarlı; blok kategori renkleri bilerek korunuyor. |
| Kostüm editörü | 5,5 | 8,0 | Eski pill/ince çerçeve dili kaldırıldı. |
| Ses editörü | 5,5 | 8,0 | Dalga ve kontrol alanı yeniden temalandı. |
| Ders kütüphanesi | 8,5 | 8,5 | Kartlar ve filtreler tutarlı. |
| Ders rehberi | 8,0 | 8,0 | Uzun içerik ve alt eylemler okunaklı. |
| Giriş / Paylaşılanlar | 8,5 | 8,5 | Form hiyerarşisi ve odaklar net. |
| Eklenti kütüphanesi | 8,5 | 8,5 | Ortak kütüphane sistemiyle uyumlu. |
| Hakkında | 7,0 | 8,5 | Şeffaf logo ile mor dikdörtgen kaldırıldı. |
| Yönetici paneli (kilitli durum) | 8,0 | 8,0 | Giriş öncesi durum ve daraltma kontrolü net. |
| Prompt / değişken oluşturma | 8,5 | 8,5 | Klavye odağı ve birincil eylem belirgin. |

### Kalan işler

Hepsi görsel; mantığı bozmamaya dikkat et.

1. **Donanım ve hata durumlarını gerçek koşulda aç:** Kaynak stilleri tamamlanan bağlantı, telemetri,
   kayıt, WebGL, tarayıcı uyumsuzluğu ve debug pencereleri ancak ilgili cihaz/izin/hata koşulu oluştuğunda
   son görsel QA'den geçirilebilir.
2. **Blockly'nin kendi arayüzü:** değişken prompt'u tamam. Açılır listeler (`.blocklyDropDownDiv`,
   `.goog-menu`) ve sağ tık menüsü uzun seçeneklerle ayrıca kontrol edilmeli.
3. **Ders/yönetici ayrıntıları:** kilitli yönetici paneli ve rehber kontrol edildi. API çalışırken giriş
   sonrası kalabalık ders/sınıf tablolarının uzun içerik ve taşma durumları ayrıca kontrol edilmeli.
4. **Küçük ekranlar:** Giriş/Kaydol çakışması giderildi ve 1024 px'de doğrulandı. Sayfa yine en az
   1024 px genişlik varsayar; daha dar tablet/telefon yerleşimi ayrı bir kapsamdır.

## 6. Teknik tuzaklar

- **CSS modülleri:** sınıf adları `[dosya]_[sınıf]_[5 harfli hash]` (örn. `menu-bar_menu-bar-item_NKeCD`). Hash değişse de önek sabittir; genel seçici gerekiyorsa `[class*="menu-bar_menu-bar-item"]` biçimi çalışır (ses modülü bunu kullanıyor). Dev ve canlı sürümde aynıdır.
- `@import "../../css/colors.css"` satırı olmayan bir dosyada `$nb-*` değişkenleri tanımsızdır; her CSS dosyası kendi içe aktarmalarını yapar. `units.css`'te yazı tipi değişkenleri vardır.
- `postcss-import`, `url()` yollarını **içe aktaran** dosyaya göre çözer; bu yüzden `fonts.css` içindeki yollar `../css/fonts/...` biçimindedir (yalnızca `playground/index.css` içe aktarır).
- `translate`/`rotate`/`scale` CSS özellikleri kullanıldı (modern tarayıcı varsayımı), `transform` değil.
- `box-sizing: content-box !important` stage için bilerek var; stage kenarlığını değiştirirsen yerleşim hesaplarını kontrol et (şu an 3 px).
- Blok kategori sütunu ve flyout rengi `blocks.css`'te; Blockly'nin kendi CSS'i çalışma anında eklendiği için gerekirse `!important` ya da daha özgül seçici kullan.
- Beyaz SVG simgeleri `$nb-ink-filter` ile petrol yeşiline çevriliyor (`action-menu`, modal,
  `delete-button`, `close-button`, eklenti düğmesi). Koyu zeminde simge gerekirse bu filtreyi kaldır.
- Beyaz yazı (`color: $ui-white` / `white`) hâlâ birçok dosyada duruyor; zemini açık renge çevirdiğin yerlerde mutlaka koyu yazıya çevir. Taramak için: `grep -rnE "^\s*(color|fill): *(\\\$ui-white|white|#fff)" src --include="*.css"`.

## 7. Nasıl doğrularsın

1. `npm start` ile arayüzü aç; tarayıcı penceresini yaklaşık 1100–1440 px genişliğe getir.
2. Her ekranı aç: ana editör, Kostümler/Sesler sekmeleri, Düzenle/Dosya menüleri, kukla/dekor ekle menüsü ve ipuçları, kütüphane pencereleri, Giriş/Kaydol, Paylaşılanlar, Hakkında (logoya tıkla), `/?author`.
3. Hover ve basma efektlerini dene; sesleri duy (Düzenle → Arayüz sesleri).
4. `npx eslint src --ext .js,.jsx` ve `npx jest test/unit` yeşil olmalı.
5. Commit at (küçük, açıklayıcı). Dağıtım yalnızca kullanıcı isterse.

## 8. Dağıtım (bilgi için)

`./deploy.sh` GUI'yi derler (`NODE_ENV=production`), `build/` ve `server/` klasörlerini VPS'e `rsync` ile yollar, ilgili Docker servisini yeniden kurar ve sağlık kontrolü yapar. Aşama 1 henüz canlıya alınmadı; en son canlıya giden iş "60 FPS / ara değer / Hakkında sadeleştirme" idi.

## Ek: Arayüz ses haritası

Sesler `scripts/make-ui-sounds.py` ile sıfırdan üretilir (`python3 scripts/make-ui-sounds.py src/lib/ui-sounds`), eşleme `src/lib/ui-sounds.js` içindeki `RULES` tablosundadır (özelden genele, ilk eşleşen kazanır). Yeni bir eylem için sesi `RULES`'a ekle ve `test/unit/lib/ui-sounds.test.js`'e test yaz.
Sesler: click, snap, pop, delete, warn, back, start, stop, toggle, open, success, error, stone (blok bırakma), thud (blokların birleşmesi). Pencere açılışı, hata ve başarı sesleri `MutationObserver` ile ekrana eklenen öğelerden (`soundForAdded`) tetiklenir.
