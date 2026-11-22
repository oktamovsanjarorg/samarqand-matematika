/**
 * T-158: ustoz yoki yordamchi Mini App'ni ochsa, to'g'ridan-to'g'ri admin panel ochiladi.
 * initData hash'da beriladi (serverga va loglarga tushmaydi), panel uni admin tokenga almashtiradi.
 * T-168: o'quvchi ko'rinishi yo'q: xodim har doim admin panelga o'tadi.
 */
export const adminLoginUrl = (initData: string, base = import.meta.env.VITE_ADMIN_URL ?? "/admin") =>
  `${base.replace(/\/$/, "")}/login#tg=${encodeURIComponent(initData)}`;
