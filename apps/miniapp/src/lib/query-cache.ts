import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { getInitData } from "./telegram";

/**
 * T-191: oxirgi ma'lum holat (ona tili loyihasidagidek stale-while-revalidate). Ilova ochilganda oxirgi
 * ko'rilgan ma'lumot darhol chiziladi, yangisi fonda keladi: sekin internetda bo'sh "yuklanmoqda" ekrani yo'q.
 *
 * Qoidalar:
 * - Kesh faqat ko'rsatish uchun: ruxsat, ball va muddat qarorlari baribir serverdan (so'rov fonda ketadi).
 * - Telegram foydalanuvchisi bo'yicha alohida: bir telefonda ikki akkaunt bir-birining ma'lumotini ko'rmaydi.
 * - Versiya build'ga bog'langan (shu modul fayli nomidagi hash): deploy'dan keyin eski shakldagi
 *   ma'lumot o'qilmaydi (ona tili loyihasida eski shakl oq ekran bergan).
 * - Faqat ro'yxatdagi kalitlar: test savollari, urinishlar, to'lov va AI suhbatlari keshlanmaydi.
 */
const CACHED = new Set([
  "profile",
  "stats",
  "progress",
  "recommendations",
  "weekly",
  "mocks",
  "ranking",
  "school",
  "courses",
  "offline-results",
  "children",
  "child",
]);
const PREFIX = "skd-q:";
const MAX_AGE_MS = 7 * 24 * 3600_000;
const MAX_BYTES = 400_000;
const SAVE_DELAY_MS = 1000;

interface Saved {
  build: string;
  savedAt: number;
  entries: { key: QueryKey; data: unknown; updatedAt: number }[];
}

const build = new URL(import.meta.url).pathname;

/** initData'dagi Telegram ID (imzosi server tekshiradi, bu yerda faqat kesh nomi uchun) */
function storageKey(): string | null {
  try {
    const user = new URLSearchParams(getInitData() ?? "").get("user");
    const id = user ? (JSON.parse(user) as { id?: unknown }).id : undefined;
    return typeof id === "number" ? `${PREFIX}${id}` : null;
  } catch {
    return null;
  }
}

function read(key: string): Saved | null {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null") as Saved | null;
    if (!saved || saved.build !== build || Date.now() - saved.savedAt > MAX_AGE_MS) return null;
    return saved;
  } catch {
    return null;
  }
}

function write(qc: QueryClient, key: string): void {
  const entries = qc
    .getQueryCache()
    .getAll()
    .filter((q) => q.state.status === "success" && CACHED.has(String(q.queryKey[0])))
    .map((q) => ({ key: q.queryKey, data: q.state.data, updatedAt: q.state.dataUpdatedAt }));
  const text = JSON.stringify({ build, savedAt: Date.now(), entries } satisfies Saved);
  try {
    // Boshqa akkauntlar va eski versiyalar joy egallamasin
    for (const k of Object.keys(localStorage))
      if (k.startsWith(PREFIX) && k !== key) localStorage.removeItem(k);
    if (text.length <= MAX_BYTES) localStorage.setItem(key, text);
    else localStorage.removeItem(key);
  } catch {
    // Xotira to'la yoki yopiq: kesh ixtiyoriy
  }
}

/** Keshdagi ma'lumotni QueryClient'ga yozadi va keyingi o'zgarishlarni saqlab boradi */
export function persistQueries(qc: QueryClient): void {
  const key = storageKey();
  if (!key) return;
  for (const e of read(key)?.entries ?? []) qc.setQueryData(e.key, e.data, { updatedAt: e.updatedAt });
  let timer: ReturnType<typeof setTimeout> | undefined;
  qc.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || !CACHED.has(String(event.query.queryKey[0]))) return;
    clearTimeout(timer);
    timer = setTimeout(() => write(qc, key), SAVE_DELAY_MS);
  });
}
