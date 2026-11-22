#!/usr/bin/env bash
# Kunlik zaxira (serverda, cron 03:00 Toshkent):
#  1. pg_dump (custom format), pg_restore --list bilan butunligi tekshiriladi.
#     Yakshanba kunlari (yoki RESTORE_CHECK=always) vaqtinchalik konteynerga to'liq tiklab ko'riladi (T-144)
#  2. Serverda 14 kunlik nusxa qoladi
#  3. S3: db/daily/ (90 kun), oyning 1-kuni db/monthly/ (2 yil, Glacier IR). Server roli faqat yoza oladi, o'chira olmaydi
#  4. To'lov cheklari (samarqand_media volume) S3 media/ ga sinxronlanadi (o'chirmasdan)
#  5. Xato bo'lsa ustoz(lar)ga bot orqali xabar boradi
#  6. Muvaffaqiyat vaqti AppSetting "backup:last" ga yoziladi: eskirsa admin ogohlantiradi (T-145)
# Tiklash: scripts/restore.sh <fayl yoki s3://...>
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/samarqand}"
ROOT="${BACKUP_ROOT:-/home/ubuntu/samarqand-backups}"
BUCKET="${BACKUP_BUCKET:-samarqand-matematika-backups-560418470850}"
TS="$(date +%Y%m%d-%H%M)"
umask 077
mkdir -p "$ROOT"

BOT_TOKEN="$(grep -E '^BOT_TOKEN=' "$APP_DIR/.env" | head -1 | cut -d= -f2- | tr -d '"')"

owners() {
  docker exec samarqand-postgres psql -U samarqand -d samarqand -tAc \
    "select \"telegramId\" from \"User\" where role='TEACHER' and \"isBlocked\"=false" 2>/dev/null || true
}

fail() {
  echo "!!! $(date -Is) zaxira xato: $1"
  for chat in $(owners); do
    curl -s -m 30 -o /dev/null "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
      --data-urlencode "chat_id=${chat}" --data-urlencode "text=⚠️ Zaxira nusxa olinmadi: $1" || true
  done
  exit 1
}
trap 'fail "kutilmagan xato (qator $LINENO)"' ERR

s3() {
  docker run --rm -v "$ROOT:/backups:ro" amazon/aws-cli:2.27.50 s3 "$@"
}

echo "=== $(date -Is) zaxira boshlandi"
FILE="$ROOT/db-$TS.dump"
docker exec samarqand-postgres pg_dump -U samarqand -d samarqand -Fc -Z 9 > "$FILE" || fail "pg_dump"
[[ -s "$FILE" ]] || fail "bo'sh nusxa"
docker exec -i samarqand-postgres pg_restore --list < "$FILE" > /dev/null || fail "nusxa buzuq (pg_restore --list)"
if [[ "$(date +%u)" == "7" || "${RESTORE_CHECK:-}" == "always" ]]; then
  "$APP_DIR/scripts/restore-check.sh" "$FILE" || fail "nusxa tiklanmadi (tiklash sinovi)"
fi

s3 cp --only-show-errors "/backups/$(basename "$FILE")" "s3://$BUCKET/db/daily/$(basename "$FILE")" || fail "S3 ga yuklab bo'lmadi"
if [[ "$(date +%d)" == "01" ]]; then
  s3 cp --only-show-errors "/backups/$(basename "$FILE")" "s3://$BUCKET/db/monthly/$(basename "$FILE")" || fail "S3 oylik"
fi

# Cheklar moliyaviy dalil: server yo'qolsa ham saqlanib qolishi kerak. --delete yo'q (rol o'chira olmaydi ham)
docker run --rm -v samarqand_media:/media:ro amazon/aws-cli:2.27.50 \
  s3 sync --only-show-errors /media "s3://$BUCKET/media/" || fail "cheklarni S3 ga yuklab bo'lmadi"

find "$ROOT" -name 'db-*.dump' -mtime +14 -delete

# T-145: muvaffaqiyatli zaxira vaqti. Cron ishlamay qolsa xato xabari ham ketmaydi: admin va ertalabki
# xulosa shu vaqt 36 soatdan eskirganini ko'rib ogohlantiradi
docker exec samarqand-postgres psql -U samarqand -d samarqand -qtAc \
  "insert into \"AppSetting\" (key, value, \"updatedAt\") values ('backup:last', 'true', now())
   on conflict (key) do update set \"updatedAt\" = now()" > /dev/null || echo "!!! zaxira vaqti bazaga yozilmadi"
echo "=== $(date -Is) tayyor: $(basename "$FILE") ($(du -h "$FILE" | cut -f1))"
