/**
 * Lokal dev: brauzerda Telegram'siz kirish uchun imzolangan initData yasaydi va
 * apps/miniapp/.env.local ga VITE_DEV_INIT_DATA qilib yozadi. Foydalanish: pnpm dev:init-data [username]
 */
import { writeFileSync } from "node:fs";
import { signInitData } from "@samarqand/shared/server";

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN .env da yo'q");

const username = process.argv[2] ?? "dev_student";
const user = JSON.stringify({ id: 777000001, first_name: "Dev", username });
const initData = signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user }, token);

writeFileSync("apps/miniapp/.env.local", `VITE_DEV_INIT_DATA=${initData}\n`);
console.info(`apps/miniapp/.env.local yozildi (${username}, 24 soat amal qiladi)`);
