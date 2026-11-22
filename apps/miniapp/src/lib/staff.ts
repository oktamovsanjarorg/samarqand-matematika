/**
 * T-158: ustoz yoki yordamchi Mini App'ni ochsa, to'g'ridan-to'g'ri admin panel ochiladi.
 * initData hash'da beriladi (serverga va loglarga tushmaydi), panel uni admin tokenga almashtiradi.
 * ?view=student: ustoz ilovani o'quvchi ko'zi bilan ko'radi (shu oyna yopilguncha).
 */
const VIEW_KEY = "samarqand-student-view";

export function studentView(search = window.location.search): boolean {
  try {
    if (new URLSearchParams(search).get("view") === "student") sessionStorage.setItem(VIEW_KEY, "1");
    return sessionStorage.getItem(VIEW_KEY) === "1";
  } catch {
    return false;
  }
}

export const adminLoginUrl = (initData: string, base = import.meta.env.VITE_ADMIN_URL ?? "/admin") =>
  `${base.replace(/\/$/, "")}/login#tg=${encodeURIComponent(initData)}`;
