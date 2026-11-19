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

## Keyingi qadamlar (T-011)

- Domen: DNS A yozuvi `13.62.27.178` ga yo'naltiriladi (Q-01).
- Serverda Caddy (HTTPS, Let's Encrypt) va `docker compose` (postgres, redis, api, bot, web).
- Zaxira: kechasi `pg_dump`, S3 ga yoziladi. Faqat shu bucket uchun alohida IAM roli yaratiladi, ona tilining `prod-backup-profile` roli ishlatilmaydi.
