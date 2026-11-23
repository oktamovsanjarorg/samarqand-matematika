/**
 * T-158: ustoz yoki yordamchi Mini App'ni ochsa, to'g'ridan-to'g'ri admin panel ochiladi.
 * initData hash'da beriladi (serverga va loglarga tushmaydi), panel uni admin tokenga almashtiradi.
 * T-168: o'quvchi ko'rinishi yo'q: xodim har doim admin panelga o'tadi.
 */
export const adminLoginUrl = (initData: string, base = import.meta.env.VITE_ADMIN_URL ?? "/admin") =>
  `${base.replace(/\/$/, "")}/login#tg=${encodeURIComponent(initData)}`;

/**
 * T-175: kompyuterdagi Telegram (Desktop, macOS, Web) admin panelni Mini App oynasida ochmaydi: ekran bo'sh qoladi
 * (Linux Telegram Desktop'da 22-noyabrdan beri bironta kirish yo'q). U yerda panel tugma bilan tizim brauzerida ochiladi.
 * Telefonda (android, ios) avvalgidek darhol o'tadi.
 */
const DESKTOP_PLATFORMS = ["tdesktop", "macos", "weba", "webk", "unigram"];

export const adminInBrowser = (platform: string | undefined) =>
  !!platform && DESKTOP_PLATFORMS.includes(platform);

/** openLink to'liq manzil talab qiladi */
export const absoluteUrl = (url: string, origin = window.location.origin) => new URL(url, origin).href;
