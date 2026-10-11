#!/usr/bin/env bash
# SARIKEDİ dağıtımı: yerelde derle → VPS'e aktar → yalnızca sarikedi servisini yeniden kur → doğrula.
# Kullanım: ./deploy.sh            (GUI'yi derle + backend + dağıt)
#           ./deploy.sh --no-build (mevcut build/ klasörünü kullan)
# nginx / diğer servislere dokunmaz.
set -euo pipefail
cd "$(dirname "$0")"

HOST=${DEPLOY_HOST:-vps}
REMOTE=${DEPLOY_DIR:-server/sarikedi}   # ssh oturumunun ev dizinine göre
SITE=${DEPLOY_URL:-https://xn--sarkedi-tfb.com}

if [ "${1:-}" != "--no-build" ]; then
  echo "==> GUI derleniyor"
  NODE_ENV=production NODE_OPTIONS=--openssl-legacy-provider npm run build >/tmp/sarikedi-build.log 2>&1 ||
    { tail -30 /tmp/sarikedi-build.log; echo "Derleme başarısız"; exit 1; }
fi

# Derleme bütünlüğü: gui.js'in istediği her chunks/*.js dosyası build/ içinde olmalı
for f in $(grep -oh 'chunks/[A-Za-z0-9._-]*\.js' build/gui.js | sort -u); do
  [ -f "build/$f" ] || { echo "Eksik dosya: build/$f"; exit 1; }
done

echo "==> Dosyalar aktarılıyor"
rsync -a --delete --exclude='._*' --exclude='.DS_Store' --exclude='*.map' \
  --exclude='blocksonly*' --exclude='compatibilitytesting*' build/ "$HOST:$REMOTE/gui/"
rsync -a --delete --exclude='._*' --exclude='.DS_Store' --exclude='node_modules' --exclude='data' \
  server/ "$HOST:$REMOTE/server/"

LOCAL_SUM=$(md5 -q build/gui.js 2>/dev/null || md5sum build/gui.js | cut -d' ' -f1)
REMOTE_SUM=$(ssh "$HOST" "md5sum $REMOTE/gui/gui.js | cut -d' ' -f1")
[ "$LOCAL_SUM" = "$REMOTE_SUM" ] || { echo "gui.js md5 uyuşmuyor"; exit 1; }

echo "==> Yalnızca sarikedi servisi yeniden kuruluyor"
ssh "$HOST" "cd ~/server && docker compose build sarikedi >/tmp/sarikedi-docker.log 2>&1 && docker compose up -d sarikedi"

echo "==> Doğrulama"
for i in $(seq 1 20); do
  curl -fsS "$SITE/api/health" >/dev/null 2>&1 && break
  sleep 2
done
curl -fsS "$SITE/api/health"; echo
curl -fsS "$SITE/api/lessons" | head -c 120; echo
W=$(grep -oh 'chunks/fetch-worker\.[a-f0-9]*\.js' build/gui.js | sort -u | head -1)
echo "fetch-worker: $(curl -s -o /dev/null -w '%{http_code}' "$SITE/$W")"
echo "Bitti: $SITE"
