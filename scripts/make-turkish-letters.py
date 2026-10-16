"""Harfler kütüphanesine Türkçe harfler (Ç Ğ İ Ö Ş Ü) ekler: her stil (Block, Glow, Story) için SVG kuklalar üretir.

Mevcut Scratch harf SVG'lerinin üstüne, stile uygun noktalar, breve ve çengel çizilir. Üretilen SVG'ler
static/tr-letters/<md5>.svg olarak saklanır; sprites.json ve tr-letter-assets.json güncellenir.
Çalıştırma (ağ gerekir, taban harfler CDN'den indirilir): python3 scripts/make-turkish-letters.py
"""
import hashlib
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES = os.path.join(ROOT, 'src/lib/libraries/sprites.json')
OUT_DIR = os.path.join(ROOT, 'static/tr-letters')
ASSET_LIST = os.path.join(ROOT, 'src/lib/libraries/tr-letter-assets.json')
CACHE = os.environ.get('LETTER_CACHE', '/tmp/letters-cache')
CDN = 'https://cdn.assets.scratch.mit.edu/internalapi/asset/%s/get/'

# yeni harf: (taban harf, işaret)
LETTERS = {'Ç': ('C', 'cedilla'), 'Ğ': ('G', 'breve'), 'İ': ('I', 'dot'),
           'Ö': ('O', 'umlaut'), 'Ş': ('S', 'cedilla'), 'Ü': ('U', 'umlaut')}
STYLES = ['Block', 'Glow', 'Story']


def fetch(md5ext):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, md5ext)
    if not os.path.exists(path):
        subprocess.run(['curl', '-s', '-f', '-o', path, CDN % md5ext], check=True)
    return open(path, encoding='utf-8').read()


def viewbox(svg):
    m = re.search(r'viewBox="([^"]+)"', svg)
    x, y, w, h = [float(v) for v in m.group(1).split()]
    return x, y, w, h


def fmt(v):
    return ('%.3f' % v).rstrip('0').rstrip('.')


# Her stil için işaretlerin çizimi: katmanlar (dış, iç) olarak [(kalınlık/yarıçap eki, renk)] biçiminde
STYLE = {
    # turuncu harf, kalın siyah dış hat
    'Block': {'outer': '#000000', 'inner': '#FF9400', 'dot': 7.5, 'rim': 4.0, 'stroke': 9.0, 'rimStroke': 7.0, 'ref': 80},
    # beyaz harf, turkuaz hale
    'Glow': {'outer': '#00CCCC', 'inner': '#FFFFFF', 'dot': 6.0, 'rim': 6.5, 'stroke': 6.5, 'rimStroke': 12.0, 'ref': 76},
    # düz yeşil serif harf, ince beyaz çizgi
    'Story': {'outer': '#53AD4E', 'inner': '#FFFFFF', 'dot': 6.3, 'rim': 0.0, 'stroke': 5.2, 'rimStroke': 0.0, 'ref': 53},
}


def dot(cx, cy, st, k):
    r, rim = st['dot'] * k, st['rim'] * k
    parts = []
    if rim:
        parts.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" transform="rotate(-12 %s %s)"/>' % (
            fmt(cx), fmt(cy), fmt((r + rim) * 1.04), fmt((r + rim) * 0.96), st['outer'], fmt(cx), fmt(cy)))
        parts.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" transform="rotate(-12 %s %s)"/>' % (
            fmt(cx), fmt(cy), fmt(r * 1.04), fmt(r * 0.96), st['inner'], fmt(cx), fmt(cy)))
    else:  # Story: yeşil nokta + içinde ince beyaz halka
        parts.append('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (fmt(cx), fmt(cy), fmt(r), st['outer']))
        parts.append('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%s"/>' % (
            fmt(cx), fmt(cy), fmt(r * 0.5), st['inner'], fmt(max(0.7, 0.8 * k))))
    return ''.join(parts)


def stroked(d, st, k):
    """Yuvarlak uçlu çizgi işareti (breve, çengel): önce dış hat, üstüne iç renk."""
    parts = []
    if st['rimStroke']:
        parts.append('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" '
                     'stroke-linejoin="round"/>' % (d, st['outer'], fmt((st['stroke'] + st['rimStroke']) * k)))
        parts.append('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" '
                     'stroke-linejoin="round"/>' % (d, st['inner'], fmt(st['stroke'] * k)))
    else:
        parts.append('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" '
                     'stroke-linejoin="round"/>' % (d, st['outer'], fmt(st['stroke'] * k)))
    return ''.join(parts)


def build(style, mark, base_svg):
    st = STYLE[style]
    x, y, w, h = viewbox(base_svg)
    k = h / st['ref']  # harf boyuna göre işaret ölçeği
    cx = x + (w / 2)
    top_extra = bottom_extra = 0.0
    parts = ''
    pad = (st['rim'] + 2) * k
    if mark in ('dot', 'umlaut', 'breve'):
        gap = 5 * k
        if mark == 'breve':
            half, depth = 15 * k, 8 * k
            ytop = y - gap - (st['stroke'] + st['rimStroke']) * k / 2
            cy = ytop - depth
            d = 'M %s %s Q %s %s %s %s' % (fmt(cx - half), fmt(cy), fmt(cx), fmt(cy + (2 * depth)),
                                           fmt(cx + half), fmt(cy))
            parts = stroked(d, st, k)
            top_extra = (y - cy) + ((st['stroke'] + st['rimStroke']) * k / 2) + pad
        else:
            r = st['dot'] * k
            ry = y - gap - r - (st['rim'] * k)
            xs = [cx] if mark == 'dot' else [x + (w * 0.30), x + (w * 0.70)]
            parts = ''.join(dot(px, ry, st, k) for px in xs)
            top_extra = (y - ry) + r + (st['rim'] * k) + pad
    elif mark == 'cedilla':
        yb = y + h - (3 * k)
        d = ('M %s %s C %s %s %s %s %s %s C %s %s %s %s %s %s' % (
            fmt(cx - 1 * k), fmt(yb), fmt(cx + 10 * k), fmt(yb + 1 * k), fmt(cx + 13 * k), fmt(yb + 11 * k),
            fmt(cx + 5 * k), fmt(yb + 15 * k), fmt(cx + 1 * k), fmt(yb + 17 * k), fmt(cx - 7 * k),
            fmt(yb + 15 * k), fmt(cx - 10 * k), fmt(yb + 10 * k)))
        parts = stroked(d, st, k)
        bottom_extra = (yb + (17 * k) + ((st['stroke'] + st['rimStroke']) * k / 2) + pad) - (y + h)
    ny, nh = y - top_extra, h + top_extra + bottom_extra
    svg = re.sub(r'viewBox="[^"]+"', 'viewBox="%s %s %s %s"' % (fmt(x), fmt(ny), fmt(w), fmt(nh)), base_svg, count=1)
    svg = re.sub(r'(<svg[^>]*?) width="[^"]+"', r'\1 width="%s"' % fmt(w), svg, count=1)
    svg = re.sub(r'(<svg[^>]*?) height="[^"]+"', r'\1 height="%s"' % fmt(nh), svg, count=1)
    svg = re.sub(r'enable-background="[^"]*"', '', svg)
    svg = svg.replace('</svg>', '<g>%s</g></svg>' % parts)
    return svg, w, nh


def main():
    sprites = json.load(open(SPRITES, encoding='utf-8'))
    by_name = {s['name']: s for s in sprites}
    turkish = set('%s-%s' % (st, ch) for st in STYLES for ch in LETTERS)
    sprites = [s for s in sprites if s['name'] not in turkish]
    sounds = by_name['Block-A']['sounds']
    os.makedirs(OUT_DIR, exist_ok=True)
    for old in os.listdir(OUT_DIR):
        os.remove(os.path.join(OUT_DIR, old))
    ids = []
    new_entries = {}
    for st in STYLES:
        for ch, (base, mark) in LETTERS.items():
            base_sprite = by_name['%s-%s' % (st, base)]
            costume = base_sprite['costumes'][0]
            svg, w, h = build(st, mark, fetch(costume['md5ext']))
            data = svg.encode('utf-8')
            md5 = hashlib.md5(data).hexdigest()
            with open(os.path.join(OUT_DIR, md5 + '.svg'), 'wb') as f:
                f.write(data)
            ids.append(md5)
            name = '%s-%s' % (st, ch)
            new_entries[name] = {
                'name': name,
                'tags': ['alphabet', 'letters'],
                'isStage': False,
                'variables': {},
                'costumes': [{
                    'assetId': md5, 'name': name.replace('-', '-', 1), 'bitmapResolution': 1,
                    'md5ext': md5 + '.svg', 'dataFormat': 'svg',
                    'rotationCenterX': round(w / 2), 'rotationCenterY': round(h / 2)
                }],
                'sounds': sounds,
                'blocks': {},
                'rawURL': 'static/tr-letters/%s.svg' % md5
            }
    # her stilin Z harfinden hemen sonra ekle
    result = []
    for s in sprites:
        result.append(s)
        for st in STYLES:
            if s['name'] == '%s-Z' % st:
                result.extend(new_entries['%s-%s' % (st, ch)] for ch in LETTERS)
    json.dump(result, open(SPRITES, 'w', encoding='utf-8'), ensure_ascii=False, indent=4)
    open(SPRITES, 'a').write('\n')
    json.dump(sorted(ids), open(ASSET_LIST, 'w'), indent=2)
    open(ASSET_LIST, 'a').write('\n')
    print('üretilen SVG:', len(ids))


if __name__ == '__main__':
    sys.exit(main())
