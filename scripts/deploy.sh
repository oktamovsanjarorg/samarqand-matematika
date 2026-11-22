#!/usr/bin/env bash
# Serverda ishlaydi: main'dagi oxirgi commitni oladi, image'larni quradi va qayta ishga tushiradi.
# Chaqirish: noutbukdan `scripts/deploy-remote.sh` yoki CI (deploy kaliti faqat shu skriptni ishga tushira oladi).
# Qoida: serverda kod qo'lda tahrirlanmaydi, faqat shu skript orqali yangilanadi.
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/samarqand}"
cd "$APP_DIR"

exec 9>/tmp/samarqand-deploy.lock
# T-160: ketma-ket merge'larda oldingi deploy tugashini kutadi (12 daqiqagacha), keyin main'ning eng oxirgisini oladi.
# CI'da bekor qilingan run serverdagi deploy'ni to'xtatmaydi: kutmasa keyingisi yiqilardi.
if ! flock -n 9; then
  echo "Oldingi deploy tugashini kutyapman..."
  flock -w 720 9 || { echo "Boshqa deploy 12 daqiqadan beri ishlayapti"; exit 1; }
fi

before="$(git rev-parse --short HEAD)"
git fetch --quiet origin main
git checkout --quiet --force origin/main
after="$(git rev-parse --short HEAD)"
echo "== $(date -Is) deploy $before -> $after"

docker compose build --pull
docker compose up -d --remove-orphans
docker image prune -f >/dev/null
# Build keshi har deploy'da o'sadi (bir kunda 23 GB bo'lgan): 4 GB dan ortig'i tozalanadi.
# Yangi buildx'da --reserved-space, eskisida --keep-storage
docker builder prune -af --reserved-space 4gb >/dev/null 2>&1 \
  || docker builder prune -af --keep-storage 4gb >/dev/null 2>&1 || true

# API sog'lom bo'lguncha kutamiz (migratsiyalar shu yerda qo'llanadi)
for _ in $(seq 1 40); do
  status="$(docker inspect -f '{{.State.Health.Status}}' samarqand-api 2>/dev/null || echo none)"
  [[ "$status" == "healthy" ]] && { echo "API sog'lom ($after)"; docker compose ps --format 'table {{.Service}}\t{{.Status}}'; exit 0; }
  sleep 3
done
echo "!!! API sog'lom bo'lmadi"; docker compose logs --tail 50 api; exit 1
