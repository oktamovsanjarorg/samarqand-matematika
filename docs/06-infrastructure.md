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

## Deploy (T-011)

- Manzil: domen kelguncha `https://13-62-27-178.sslip.io` (sslip.io IP'ga yo'naltiradi, Caddy Let's Encrypt sertifikatini oladi). Domen kelganda serverdagi `.env` da faqat `DOMAIN` o'zgaradi.
- Serverda: `~/samarqand` (git clone, read-only deploy key), sirlar `~/samarqand/.env` da (chmod 600, serverda yaratilgan).
- Konteynerlar: `postgres`, `redis`, `api` (ishga tushishda `prisma migrate deploy`), `bot`, `web` (Caddy: Mini App `/`, admin `/admin/`, `/api` proxy).
- **Avtomatik:** `main` ga push → CI yashil → `deploy` job SSH orqali `scripts/deploy.sh` ni chaqiradi. CI kaliti serverda faqat shu skriptni ishga tushira oladi (`authorized_keys` dagi `command=`).
- Qo'lda: `scripts/deploy-remote.sh` (noutbukdan).
- Qoida: serverda kod qo'lda tahrirlanmaydi.

## Zaxira

- `scripts/backup.sh`, cron har kuni 03:00 (Toshkent): `pg_dump` qilinadi va `pg_restore --list` bilan tekshiriladi.
- Serverda 14 kunlik nusxa saqlanadi: `~/samarqand-backups`.
- S3 bucket: `samarqand-matematika-backups-560418470850` (eu-north-1, versioning, shifrlangan, public yopiq).
  - `db/daily/`: 90 kun saqlanadi.
  - `db/monthly/`: 2 yil saqlanadi, 30 kundan keyin Glacier IR'ga o'tkaziladi.
- IAM: `samarqand-backup-role` (instance profile `samarqand-backup-profile`) faqat `db/*` ga yozadi va o'qiydi. O'chirish huquqi yo'q, shuning uchun server buzilsa ham zaxirani o'chirib bo'lmaydi.
- Xato bo'lsa, ustozlarga bot orqali xabar boradi.
- Tiklash: `scripts/restore.sh <fayl | s3://...>` (tasdiq so'raydi).
