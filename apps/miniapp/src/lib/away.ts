import { AWAY_MAX_MS } from "@samarqand/shared";
import { useEffect } from "react";
import { post } from "./api";
import { tg } from "./telegram";

/** Bir soniyadan qisqa chiqish (bildirishnoma pardasi, tasodifiy bosish) hisoblanmaydi */
const MIN_MS = 1000;

/**
 * T-193: haftalik va mock testida ilovadan chiqish: o'quvchi qaytganda tashqarida bo'lgan vaqt serverga
 * ketadi (ustozga signal, o'quvchiga ko'rinmaydi). Qaytmagan chiqish (ilova yopilgan) hisoblanmaydi:
 * yolg'on signaldan ko'ra o'tkazib yuborish afzal. Telegram 8.0+ da `deactivated`/`activated` ham ishlaydi.
 */
export function useAwayTracker(path: string | null): void {
  useEffect(() => {
    if (!path) return;
    let since: number | null = null;
    const leave = () => {
      since ??= Date.now();
    };
    const back = () => {
      if (since === null) return;
      const ms = Math.min(Date.now() - since, AWAY_MAX_MS);
      since = null;
      if (ms >= MIN_MS) void post(path, { ms }).catch(() => undefined);
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? leave() : back());
    document.addEventListener("visibilitychange", onVisibility);
    tg?.onEvent("deactivated", leave);
    tg?.onEvent("activated", back);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      tg?.offEvent?.("deactivated", leave);
      tg?.offEvent?.("activated", back);
    };
  }, [path]);
}
