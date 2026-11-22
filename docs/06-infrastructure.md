# 06: Infratuzilma

## Production server (2026-11-19)

| Parametr         | Qiymat                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| Provayder, hudud | AWS, `eu-north-1` (Stockholm). Frankfurtda vCPU kvotasi to'lgan edi (8/8). 16 ga oshirish so'rovi ochiq |
| Instance         | `samarqand-prod` · t4g.medium (2 vCPU ARM Graviton, 4 GB RAM) · CPU kredit rejimi: unlimited            |
| OS               | Ubuntu 24.04 LTS arm64, `Asia/Tashkent`, 2 GB swap                                                      |
| Disk             | 40 GB gp3, shifrlangan                                                                                  |
| IP               | Elastic IP `13.62.27.178`                                                                               |
| Kirish           | SSH faqat kalit bilan (`sanjar-ed25519`), noutbukda `ssh samarqand-prod`                                |
| Security group   | `samarqand-prod-web-ssh`: 22/tcp, 80/tcp, 443/tcp+udp                                                   |
| IMDS             | v2 majburiy, hop limit 2 (konteynerlar uchun)                                                           |
| Dastur           | Docker 29, Compose v5, log rotatsiya (20 MB × 5)                                                        |
| Teglar           | `Project=samarqand-matematika` (xarajatni ajratish uchun)                                               |

## Telegram

- Bot: `@samarqandmatematikabot`. Token faqat `.env` va serverdagi `.env` da turadi, repoga tushmaydi.
- Ommaviy xabarlar (haftalik ochilishi, e'lon, hisobotlar) sekundiga 25 tadan yuboriladi (Telegram chegarasi ~30/s). 429 kelsa `retry_after` kutilib, 2 martagacha qayta yuboriladi (T-115). 500 o'quvchiga xabar taxminan 20 soniya oladi.

## Deploy (T-011)

- Manzil: `https://app.samarqandmatematika.uz` (Mini App, `/api`, `/admin`). DNS Eskiz'da (ns1/ns2.eskiz.uz); `app`, `admin` va asosiy domen A yozuvi 13.62.27.178 ga, `www` CNAME. Pochta (`mail`, MX) Eskiz hostingida qoladi.
- Serverdagi `.env`: `DOMAIN=app.samarqandmatematika.uz`, `ADMIN_HOST=admin.samarqandmatematika.uz` (→ `/admin/`), `REDIRECT_HOSTS` (asosiy domen, `www`, eski `13-62-27-178.sslip.io` → `DOMAIN`). Caddy har biriga Let's Encrypt sertifikatini o'zi oladi.
- API ham `MINIAPP_URL` ni oladi (compose `https://${DOMAIN}` dan): xabarlardagi "ilovada ochish" tugmasi uchun (T-093).
- Bot menyusidagi Mini App manzili (`MINIAPP_URL`) bot ishga tushganda `setChatMenuButton` bilan yangilanadi.
- Serverda: `~/samarqand` (git clone, read-only deploy key), sirlar `~/samarqand/.env` da (chmod 600, serverda yaratilgan).
- Konteynerlar: `postgres`, `redis`, `api` (ishga tushishda `prisma migrate deploy`), `bot`, `web` (Caddy: Mini App `/`, admin `/admin/`, `/api` proxy).
- **Avtomatik:** `main` ga push → CI yashil → `deploy` job SSH orqali `scripts/deploy.sh` ni chaqiradi. CI kaliti serverda faqat shu skriptni ishga tushira oladi (`authorized_keys` dagi `command=`). Skript eski image'larni o'chiradi va Docker build keshini 4 GB gacha qisqartiradi (aks holda disk to'ladi).
- Takroriy CI yo'q (T-149): `main` ga push'da `verified` job (`scripts/ci-verified.sh`) commit'ning fayl daraxtini merge qilingan PR'ning oxirgi commit'i bilan solishtiradi. Bir xil bo'lsa va shu commit uchun PR'da CI muvaffaqiyatli o'tgan bo'lsa, lint/test/e2e takrorlanmaydi, darhol deploy qilinadi (GitHub Actions daqiqalarining taxminan yarmi). Daraxt farq qilsa (rebase'siz merge), PR topilmasa yoki API xato bersa, to'liq tekshiruv ishlaydi. Qo'lda sinash: `REPO=owner/repo SHA=<commit> scripts/ci-verified.sh`.
- Qo'lda: `scripts/deploy-remote.sh` (noutbukdan).
- Qoida: serverda kod qo'lda tahrirlanmaydi.

## Loglar (T-106)

- Konteyner loglari (`docker logs samarqand-api`) har deploy'da yangi konteyner bilan boshlanadi.
- API so'rovlari logi Caddy'da: `/data/access.log` (`caddy_data` volume), JSON. Deploy'dan keyin ham saqlanadi: 10 MB × 5 fayl, 30 kun.
  - Faqat `/api/*` yoziladi, statik fayllar yozilmaydi.
  - `Authorization` va `Cookie` sarlavhalarini Caddy o'zi `REDACTED` qiladi. Shuning uchun API manzil yoki query'ga sir qo'yilmaydi.
  - Shaxsiy ma'lumot yozilmaydi: qidiruvdagi `?q=` (ism, telefon) `REDACTED`, IP oxirgi qismisiz (IPv4 /24). Xuddi shu filtr Caddy xato logida ham (global `log default`, `docker logs samarqand-web`). Yangi query parametrga shaxsiy ma'lumot qo'yilsa, filtrga ham qo'shiladi.
- API'dagi kutilmagan xato (T-141): mijozga oddiy 500, logga (`docker logs samarqand-api`) faqat xato nomi, kodi va stack qatorlari. Xabar matni yozilmaydi: Prisma validatsiya xatosida so'rov argumentlari (ism, telefon) bo'ladi. Bot ham shunday: Telegram xatosida faqat metod, kod va tavsif (yuborilgan xabar, `chat_id` yozilmaydi).
- 5xx javoblarni ko'rish: `docker exec samarqand-web grep '"status":5' /data/access.log | tail`.

## Zaxira

- To'xtatish (T-136): `api` va `bot` konteynerlarida `init: true`, API `exec node` bilan ishlaydi. `docker stop` (deploy) SIGTERM yuboradi: scheduler boshlangan tick'ni (xabarlar) tugatadi, HTTP server boshlangan so'rovlarni tugatadi, keyin Prisma uziladi. API uchun `stop_grace_period: 30s`. Oldin signal yetib bormasdi: har deployda 10 s kutib SIGKILL.
- `scripts/backup.sh`, cron har kuni 03:00 (Toshkent): `pg_dump` qilinadi va `pg_restore --list` bilan tekshiriladi.
- Serverda 14 kunlik nusxa saqlanadi: `~/samarqand-backups`.
- S3 bucket: `samarqand-matematika-backups-560418470850` (eu-north-1, versioning, shifrlangan, public yopiq).
  - `db/daily/`: 90 kun saqlanadi.
  - `db/monthly/`: 2 yil saqlanadi, 30 kundan keyin Glacier IR'ga o'tkaziladi.
- IAM: `samarqand-backup-role` (instance profile `samarqand-backup-profile`) faqat `db/*` ga yozadi va o'qiydi. O'chirish huquqi yo'q, shuning uchun server buzilsa ham zaxirani o'chirib bo'lmaydi.
- Xato bo'lsa, ustozlarga bot orqali xabar boradi.
- Tiklash: `scripts/restore.sh <fayl | s3://...>` (tasdiq so'raydi).
