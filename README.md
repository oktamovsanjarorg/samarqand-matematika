# Samarqand matematika

Ustoz Komil Sobirov va shogirdlari uchun matematika ta'lim platformasi: Telegram Mini App, bot va admin panel.
Reja: [docs/PLAN.md](docs/PLAN.md) · AI agentlar uchun qoidalar: [CLAUDE.md](CLAUDE.md) · Vazifalar: [docs/09-tasks.md](docs/09-tasks.md)

## Tuzilma

| Papka                | Vazifasi                                                    |
| -------------------- | ----------------------------------------------------------- |
| `apps/api`           | NestJS (Fastify) REST API, port 4300                        |
| `apps/bot`           | grammY Telegram bot                                         |
| `apps/miniapp`       | O'quvchi Mini App (React, Vite, Tailwind), port 5190        |
| `apps/admin`         | Ustoz va yordamchilar paneli (`/admin`), port 5191          |
| `packages/db`        | Prisma sxema va migratsiyalar                               |
| `packages/shared`    | Zod sxemalar, tiplar, initData tekshiruvi (`/server`)       |
| `packages/math`      | KaTeX (xavfsiz rejim), son javoblarni aniq solishtirish     |
| `packages/ui-tokens` | Ranglar (logodan olingan ko'k `#143F63`) va Tailwind preset |

## Lokal ishga tushirish

```bash
pnpm install                 # pnpm 12.16.1
cp .env.example .env         # BOT_TOKEN (test bot), JWT_SECRET, OWNER_TELEGRAM_IDS
pnpm db:up                   # Postgres :5435, Redis :6383
pnpm db:migrate
pnpm dev:init-data           # brauzerda Telegram'siz sinash uchun
pnpm dev
```

## Tekshiruvlar

`pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`. API e2e testlari uchun Postgres ishlab turishi kerak (`pnpm db:up`).
