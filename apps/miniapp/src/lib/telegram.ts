import { THEME_VARS, themeOverrides, type ThemeKey } from "./theme";

/** telegram-web-app.js beradigan window.Telegram.WebApp ustidan yupqa, tiplangan qatlam */

interface TgWebApp {
  initData: string;
  colorScheme: "light" | "dark";
  themeParams: Partial<Record<ThemeKey, string>>;
  ready(): void;
  expand(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  isVersionAtLeast?(v: string): boolean;
  onEvent(event: "themeChanged", cb: () => void): void;
  /** Bot API 6.1+: tepadagi "orqaga" tugmasi */
  BackButton?: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  /** Bot API 6.9+: raqamni botga ulashish oynasi. Raqam botga xabar bo'lib boradi */
  requestContact?(cb?: (shared: boolean) => void): void;
  openLink?(url: string): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TgWebApp };
  }
}

export const tg: TgWebApp | undefined = window.Telegram?.WebApp;

/** Telegram ichida ochilganmi (initData bo'sh bo'lmasa) */
export const isInTelegram = Boolean(tg?.initData);

/** Telegram bergan ranglar CSS o'zgaruvchilariga yoziladi; bermagani tokens.css'dagi qiymatda qoladi */
function applyTheme() {
  const set = themeOverrides(tg?.themeParams ?? {});
  const root = document.documentElement;
  root.dataset.scheme = tg?.colorScheme ?? "light";
  for (const key of Object.keys(THEME_VARS) as ThemeKey[]) {
    const rgb = set[key];
    if (rgb) root.style.setProperty(THEME_VARS[key], rgb);
    else root.style.removeProperty(THEME_VARS[key]);
  }
}

export function initTelegram() {
  applyTheme();
  if (!tg) return;
  tg.ready();
  tg.expand();
  if (tg.isVersionAtLeast?.("6.1")) {
    tg.setHeaderColor("secondary_bg_color");
    tg.setBackgroundColor("secondary_bg_color");
  }
  tg.onEvent("themeChanged", applyTheme);
}

/** Telegram'dan initData; brauzerda lokal sinash uchun VITE_DEV_INIT_DATA (pnpm dev:init-data) */
export function getInitData(): string {
  return tg?.initData || (import.meta.env.DEV ? (import.meta.env.VITE_DEV_INIT_DATA ?? "") : "");
}
