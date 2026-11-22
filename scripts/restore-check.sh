#!/usr/bin/env bash
# Zaxirani haqiqiy tiklash sinovi (T-144). `pg_restore --list` faqat fayl tuzilishini ko'radi, bu esa
# nusxani vaqtinchalik Postgres konteyneriga (tarmoqsiz, xotirada) to'liq tiklab ko'radi:
#   - jadvallar nusxa mundarijasi bilan bir xil, migratsiyalar asl bazada ham bor;
#   - asl bazada o'quvchi bo'lsa, tiklanganda ham bo'sh emas.
# Ishlatish: scripts/restore-check.sh <db-....dump>   (backup.sh yakshanba kunlari o'zi chaqiradi)
set -Eeuo pipefail

FILE="${1:?dump fayl kerak}"
SRC="${SRC_CONTAINER:-samarqand-postgres}"
SRC_USER="${SRC_USER:-samarqand}"
SRC_DB="${SRC_DB:-samarqand}"
NAME="samarqand-restore-check-$$"

cleanup() { docker rm -f "$NAME" > /dev/null 2>&1 || true; }
trap cleanup EXIT

IMAGE="$(docker inspect -f '{{.Config.Image}}' "$SRC")"
docker run -d --rm --name "$NAME" --network none --tmpfs /var/lib/postgresql/data \
  -e POSTGRES_USER=check -e POSTGRES_PASSWORD=check -e POSTGRES_DB=check "$IMAGE" > /dev/null

# Init paytida server faqat unix socket'da tinglaydi: TCP javob bersa, init tugagan
for _ in $(seq 1 60); do
  docker exec "$NAME" pg_isready -h 127.0.0.1 -U check -d check -q && break
  sleep 1
done
docker exec "$NAME" pg_isready -h 127.0.0.1 -U check -d check -q || { echo "vaqtinchalik Postgres ishga tushmadi"; exit 1; }

docker exec -i "$NAME" pg_restore -U check -d check --no-owner --no-privileges --exit-on-error < "$FILE"

src() { docker exec "$SRC" psql -U "$SRC_USER" -d "$SRC_DB" -tAc "$1"; }
dst() { docker exec "$NAME" psql -U check -d check -tAc "$1"; }

# Jadvallar: nusxa mundarijasidagi ro'yxat bilan (eski nusxa uchun ham to'g'ri: asl baza o'shandan beri o'zgargan bo'lishi mumkin)
toc="$(docker exec -i "$NAME" pg_restore --list < "$FILE" | awk '$4 == "TABLE" && $5 == "public" { print $6 }' | sort | paste -sd,)"
restored="$(dst "select tablename from pg_tables where schemaname='public' order by 1" | sort | paste -sd,)"
[[ -n "$toc" && "$toc" == "$restored" ]] || { echo "tiklangan jadvallar nusxadagidan farq qiladi"; exit 1; }

# Migratsiyalar: tiklanganlarning hammasi asl bazada ham bor (yangi deploy ustiga qo'shgan bo'lishi mumkin)
MIGRATIONS="select migration_name from _prisma_migrations where finished_at is not null order by 1"
missing="$(comm -23 <(dst "$MIGRATIONS") <(src "$MIGRATIONS"))"
[[ -z "$missing" && -n "$(dst "$MIGRATIONS")" ]] || { echo "migratsiyalar asl bazaga mos emas"; exit 1; }

USERS='select count(*) from "User"'
users_src="$(src "$USERS")"
users_dst="$(dst "$USERS")"
if [[ "$users_src" -gt 0 && "$users_dst" -eq 0 ]]; then
  echo "tiklangan bazada foydalanuvchi yo'q"
  exit 1
fi
echo "tiklash sinovi: OK (jadvallar $(tr ',' '\n' <<< "$restored" | wc -l), foydalanuvchilar $users_dst, hozir $users_src)"
