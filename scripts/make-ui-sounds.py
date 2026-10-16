"""Arayüz seslerini sıfırdan üretir (telif sorunu yok). Kullanım: python3 scripts/make-ui-sounds.py src/lib/ui-sounds"""
import os
import sys
import wave
import numpy as np

SR = 44100
rng = np.random.default_rng(5)
out = sys.argv[1]
os.makedirs(out, exist_ok=True)


def t_(d):
    return np.arange(int(d * SR)) / SR


def tone(f0, f1, d, decay):
    t = t_(d)
    f = f0 + (f1 - f0) * (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * decay)


def square(f0, d, decay):
    t = t_(d)
    return np.sign(np.sin(2 * np.pi * f0 * t)) * np.exp(-t * decay)


def noise(d, decay):
    t = t_(d)
    return rng.uniform(-1, 1, len(t)) * np.exp(-t * decay)


def mix(*parts):
    n = max(len(p[0]) + int(p[1] * SR) for p in parts)
    buf = np.zeros(n)
    for sig, delay, gain in parts:
        i = int(delay * SR)
        buf[i:i + len(sig)] += sig * gain
    return buf


def save(name, sig, level=0.8):
    sig = sig / max(1e-9, np.abs(sig).max()) * level
    with wave.open(os.path.join(out, name + ".wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((sig * 32767).astype("<i2").tobytes())


# tık: genel düğme ve menü
# (diğer seslerin gürültüsü değişmesin diye eski tıktaki rastgele sayılar aynı sırada tüketilir)
noise(0.06, 200)
t = t_(0.09)
soft = np.sin(2 * np.pi * np.cumsum(640 - 150 * (t / 0.09)) / SR) + 0.25 * np.sin(2 * np.pi * 1280 * t)
soft = soft * np.exp(-t * 42) * np.minimum(1, t / 0.003)  # 3 ms yumuşak başlangıç: çıtırtı yok
save("click", soft, 0.42)
# yerleşme: sekme, kukla/kategori seçimi
# (rastgele sayı sırası korunur ki diğer sesler değişmesin)
noise(0.18, 120)
t = t_(0.14)
knock = np.sin(2 * np.pi * np.cumsum(420 - 120 * (t / 0.14)) / SR) + 0.3 * np.sin(2 * np.pi * 840 * t)
knock = knock * np.exp(-t * 24) * np.minimum(1, t / 0.004)  # yumuşak başlangıç, gürültü yok
save("snap", knock, 0.4)
# pop: yeni kukla/kostüm/ses ekleme, kütüphaneden seçme
save("pop", mix((noise(0.25, 30), 0, 0.7), (tone(700, 140, 0.25, 14), 0, 1)))
# sil: buruşturma + alçalan ton
save("delete", mix((noise(0.38, 11), 0, 0.9), (tone(520, 70, 0.38, 7), 0, 0.8), (noise(0.12, 40), 0.18, 0.7)))
# uyarı: silme simgesine basınca (onay sorulur): iki alçak tık
save("warn", mix((tone(260, 260, 0.1, 40), 0, 1), (tone(220, 220, 0.12, 36), 0.11, 1)), 0.7)
# geri / vazgeç
save("back", mix((tone(800, 420, 0.1, 30), 0, 1), (noise(0.05, 220), 0, 0.3)), 0.7)
# başlat (yeşil bayrak): yükselen iki nota
save("start", mix((tone(520, 520, 0.1, 18), 0, 1), (tone(780, 780, 0.2, 12), 0.08, 1)), 0.75)
# durdur: alçalan iki nota
save("stop", mix((tone(640, 640, 0.1, 18), 0, 1), (tone(380, 380, 0.2, 12), 0.08, 1)), 0.75)
# aç/kapa (onay kutusu, anahtar)
save("toggle", mix((tone(1000, 1000, 0.045, 80), 0, 1), (tone(1500, 1500, 0.04, 90), 0.035, 0.6)), 0.6)
# pencere açılışı: yumuşak süzülme
t = t_(0.2)
sweep = np.sin(2 * np.pi * np.cumsum(250 + 900 * (t / 0.2) ** 2) / SR) * 0.4 + noise(0.2, 0) * 0.25
save("open", sweep * np.sin(np.pi * t / 0.2) ** 1.3, 0.55)
# başarı: kaydedildi / paylaşıldı
t = t_(0.7)
ding = sum(np.sin(2 * np.pi * f0 * t) * np.exp(-t * d) * a for f0, d, a in [(880, 5, 1), (1318.5, 6, 0.7), (1760, 8, 0.4)])
save("success", np.where(t > 0.1, ding + np.roll(ding, int(0.1 * SR)) * 0.6, ding), 0.75)
# hata: iki alçak vızıltı
save("error", mix((square(200, 0.14, 12), 0, 0.6), (square(150, 0.22, 9), 0.15, 0.6)), 0.6)
# taş: blok yerine bırakılınca; okey taşı gibi kuru, parlak ve kısa bir "klak" (alçak/davulsu kip yok)
t = t_(0.12)
modes = [(1180, 75, 1.0), (1980, 110, 0.85), (3050, 150, 0.6), (4400, 210, 0.2), (6100, 280, 0.08)]
tile = sum(np.sin(2 * np.pi * f0 * t + 0.7 * i) * np.exp(-t * d) * a for i, (f0, d, a) in enumerate(modes))
hit = noise(0.12, 520)
hit = np.convolve(np.diff(hit, prepend=0), np.ones(4) / 4, mode="same")  # hafif yumuşatılmış, kuru vuruş (tıslama yok)
body = np.sin(2 * np.pi * 540 * t) * np.exp(-t * 150) * 0.35  # ahşap istakaya değen hafif gövde
tile = tile + hit * 0.7 + body
tile = tile * np.minimum(1, t / 0.0008)
save("stone", tile, 0.5)
# thud: bloklar birleşince; taş "klak"ın daha tok ve bas hâli (aşağı çekilmiş tonlar + kısa alçak gövde)
t = t_(0.17)
modes = [(720, 80, 1.0), (1240, 115, 0.7), (1880, 150, 0.4), (2700, 200, 0.18)]
tile = sum(np.sin(2 * np.pi * f0 * t + 0.5 * i) * np.exp(-t * d) * a for i, (f0, d, a) in enumerate(modes))
hit = np.convolve(noise(0.17, 380), np.ones(10) / 10, mode="same")
bass = np.sin(2 * np.pi * np.cumsum(215 - 60 * (t / 0.17)) / SR) * np.exp(-t * 34) * 1.3
sub = np.sin(2 * np.pi * 105 * t) * np.exp(-t * 26) * 0.9
thud = tile * 0.8 + hit * 0.9 + bass + sub
thud = thud * np.minimum(1, t / 0.0012)
save("thud", thud, 0.6)
