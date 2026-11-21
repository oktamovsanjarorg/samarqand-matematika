/** Telegram mavzu ranglari: sof funksiyalar (brauzer API'siga bog'liq emas, unit test qilinadi) */
export type ThemeKey =
  | "bg_color"
  | "secondary_bg_color"
  | "section_bg_color"
  | "text_color"
  | "hint_color"
  | "link_color"
  | "destructive_text_color";

// Brend ranglari (brand, accent) Telegram'dan olinmaydi: ular tokens.css'da
export const THEME_VARS: Record<ThemeKey, string> = {
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

/** "r g b" → WCAG nisbiy yorqinlik */
function luminance(rgb: string): number {
  const [r = 0, g = 0, b = 0] = rgb.split(" ").map((x) => {
    const c = Number(x) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG kontrast nisbati ("r g b" formatida ikki rang) */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

/** Matn ranglari: fon bilan 4.5:1 (WCAG AA) bermasa Telegram'niki olinmaydi, tokens.css qiymati qoladi (T-071) */
const TEXT_KEYS: ThemeKey[] = ["text_color", "hint_color", "link_color", "destructive_text_color"];

export function themeOverrides(params: Partial<Record<ThemeKey, string>>): Partial<Record<ThemeKey, string>> {
  const all = (Object.keys(THEME_VARS) as ThemeKey[]).flatMap((key) => {
    const rgb = hexToRgb(params[key] ?? "");
    return rgb ? [[key, rgb] as const] : [];
  });
  const backs = all.filter(([key]) => !TEXT_KEYS.includes(key)).map(([, rgb]) => rgb);
  const readable = all.filter(
    ([key, rgb]) => !TEXT_KEYS.includes(key) || backs.every((bg) => contrast(rgb, bg) >= 4.5),
  );
  return Object.fromEntries(readable);
}
