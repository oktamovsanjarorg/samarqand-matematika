/** telegram-web-app.js beradigan window.Telegram.WebApp ustidan yupqa, tiplangan qatlam */
type ThemeKey =
  | "bg_color"
  | "secondary_bg_color"
  | "section_bg_color"
  | "text_color"
  | "hint_color"
  | "link_color"
  | "destructive_text_color";

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
}

declare global {
  interface Window {
    Telegram?: { WebApp: TgWebApp };
  }
}

export const tg: TgWebApp | undefined = window.Telegram?.WebApp;

/** Telegram ichida ochilganmi (initData bo'sh bo'lmasa) */
export const isInTelegram = Boolean(tg?.initData);

// Brend ranglari (brand, accent) Telegram'dan olinmaydi: ular tokens.css'da
const VARS: Record<ThemeKey, string> = {
  bg_color: "--c-bg",
  secondary_bg_color: "--c-surface",
  section_bg_color: "--c-section",
  text_color: "--c-text",
  hint_color: "--c-hint",
  link_color: "--c-link",
  destructive_text_color: "--c-danger",
};

export function hexToRgb(hex: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m?.[1]) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Telegram bergan ranglar CSS o'zgaruvchilariga yoziladi; bermagani tokens.css'dagi qiymatda qoladi */
function applyTheme() {
  const params = tg?.themeParams ?? {};
  const root = document.documentElement;
  root.dataset.scheme = tg?.colorScheme ?? "light";
  for (const key of Object.keys(VARS) as ThemeKey[]) {
    const rgb = hexToRgb(params[key] ?? "");
    if (rgb) root.style.setProperty(VARS[key], rgb);
    else root.style.removeProperty(VARS[key]);
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
