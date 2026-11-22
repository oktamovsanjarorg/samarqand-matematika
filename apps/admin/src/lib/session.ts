import type { Me } from "@samarqand/shared";

/** Admin sessiyasi localStorage'da (12 soat): telefonda panelni qayta ochganda qayta kirish shart emas */
export interface Session {
  token: string;
  user: Me;
  /** JWT exp, millisekundda */
  expiresAt: number;
}

export const SESSION_KEY = "samarqand-admin-session";
const KEY = SESSION_KEY;

/** JWT payload'idagi exp (soniya) → ms. Imzo bu yerda tekshirilmaydi: buni server qiladi */
export function jwtExpiry(token: string): number {
  try {
    const part = token.split(".")[1] ?? "";
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return (json.exp ?? 0) * 1000;
  } catch {
    return 0;
  }
}

export function loadSession(now = Date.now()): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s.expiresAt > now ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: Me): Session {
  const session = { token, user, expiresAt: jwtExpiry(token) };
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Saqlab bo'lmasa (yashirin rejim), sessiya faqat shu sahifada yashaydi
  }
  return session;
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // e'tiborsiz
  }
}

/** T-158: panel Mini App ichidan ochilgan (shu oynada): "O'quvchi ko'rinishi" havolasi shunda ko'rinadi */
const MINIAPP_KEY = "samarqand-from-miniapp";

export function markFromMiniApp() {
  try {
    sessionStorage.setItem(MINIAPP_KEY, "1");
  } catch {
    // e'tiborsiz
  }
}

export function isFromMiniApp(): boolean {
  try {
    return sessionStorage.getItem(MINIAPP_KEY) === "1";
  } catch {
    return false;
  }
}
