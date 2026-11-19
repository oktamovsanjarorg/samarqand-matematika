#!/usr/bin/env bash
# Bazani zaxiradan tiklash (serverda). DIQQAT: joriy bazadagi ma'lumot o'chiriladi.
#   scripts/restore.sh /home/ubuntu/samarqand-backups/db-20261120-0300.dump
#   scripts/restore.sh s3://samarqand-matematika-backups-560418470850/db/daily/db-20261120-0300.dump
set -Eeuo pipefail
SRC="${1:?Fayl yoki s3:// manzil kerak}"
ROOT="${BACKUP_ROOT:-/home/ubuntu/samarqand-backups}"

if [[ "$SRC" == s3://* ]]; then
  docker run --rm -v "$ROOT:/backups" amazon/aws-cli:2.27.50 s3 cp "$SRC" "/backups/restore.dump"
  SRC="$ROOT/restore.dump"
fi
[[ -s "$SRC" ]] || { echo "Fayl topilmadi: $SRC"; exit 1; }

read -r -p "Joriy baza almashtiriladi. Davom etish uchun 'tikla' deb yozing: " ok
[[ "$ok" == "tikla" ]] || { echo "Bekor qilindi"; exit 1; }

cd "${APP_DIR:-/home/ubuntu/samarqand}"
docker compose stop api bot
docker exec -i samarqand-postgres pg_restore -U samarqand -d samarqand --clean --if-exists --no-owner < "$SRC"
docker compose start api bot
echo "Tiklandi: $SRC"
