# Ders fabrikası

Dersler küçük bir kodla yazılır (`lessons/sources/*.js`). Çözüm blokları `lessons/lib/dsl.js`
ile tanımlanır; sistem bunlardan gerçek bir Scratch projesi üretir, gerçek `scratch-vm`'e
yükler, kontrol kalıplarını oradan çıkarır ve her adımı doğrular.

```bash
node lessons/build.js              # server/seed/*.json dosyalarını üretir
node lessons/verify.js [ders-id]   # her adım çözümle geçmeli, önceki durumla ve yanlış çözümlerle geçmemeli
node lessons/build-start-project.js  # dersler için temiz başlangıç projesi (server/seed/assets/bos-proje.sb3)
npm run test:lessons               # verify.js'i jest'ten çalıştırır
```

## Yeni ders eklemek

1. `lessons/sources/<id>.js` oluştur (mevcut bir dersi kopyala). `id`, `title`, `level`
   (`baslangic|orta|ileri`), benzersiz `order`, `variables` ve `steps` gerekir.
2. Her adım: `text`, `hint`, `guide` (el imleci), isteğe bağlı `scripts` (adımın çözüm durumu, tüm kuklalar),
   `focus` (hangi betik kontrol edilsin), `outcome` (sonuç kontrolü), `wrong` (geçmemesi gereken yanlış çözümler).
3. `node lessons/build.js && node lessons/verify.js <id>`.
4. Sunucuda yeni dersi yayına almak için dosyayı `server/seed/` altına koyup sunucuyu yeniden başlat
   (ya da güncellemek için `cd server && npm run reseed -- <id>`).

Ya da dersi tarayıcıdan, `/?author` yönetim paneliyle yaz (sunucuda kayıtlı olur, dosya gerekmez).

## Kurallar

- Blok etiketleri **gerçek Türkçe arayüzdeki** gibi yazılır ("x konumunu 10 değiştir", "… e değiyor mu?", "… sesini başlat").
- `focus.exactOnly: ['DY']` ile işaret hatasına karşı belirli girişler tam değer olur; `loosen` yalnızca menüler içindir
  (örn. `SOUND_MENU`). Sayılar varsayılan olarak "herhangi"dir.
- Kontroller varsayılan olarak yalnızca `focus.sprite` kuklasında aranır (`anySprite: true` ile tüm kuklalar).
- Bir adımda en çok bir palet bloğu sürükleme eylemi olabilir.
- Renderer olmadığından `touching`/renk algılama arayüzsüz doğrulamada çalışmaz: yalnızca blok yapısı doğrulanır,
  oyun mantığını tarayıcıda elle dene.
