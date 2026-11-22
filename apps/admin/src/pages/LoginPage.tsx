import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../lib/api";
import { loadSession, markFromMiniApp, saveSession } from "../lib/session";
import { CenteredCard } from "./CenteredCard";

/**
 * /admin/login#t=<token>: bot yuborgan bir martalik havola; #tg=<initData>: Mini App ichidan (T-158).
 * Ikkalasi ham hash'da: server loglariga tushmaydi
 */
export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // StrictMode effektni ikki marta chaqiradi: token bir martalik, ikkinchi so'rov uni "ishlatilgan" qiladi
    if (started.current) return;
    started.current = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get("t");
    // T-158: Mini App ichidan ochildi — Telegram imzolagan initData
    const initData = hash.get("tg");
    window.history.replaceState(null, "", window.location.pathname);
    if (!token && !initData) {
      setError("Havola notoʻgʻri. Botga /admin deb yozing.");
      return;
    }
    if (initData) markFromMiniApp();
    (initData ? adminApi.fromTelegram(initData) : adminApi.exchangeLink(token ?? ""))
      .then((auth) => {
        saveSession(auth.token, auth.user);
        onLogin();
        navigate("/", { replace: true });
      })
      .catch((e: Error) => {
        // Eski havola qayta ochildi, lekin sessiya hali amal qilyapti: xato o'rniga panelga o'tamiz
        if (loadSession()) navigate("/", { replace: true });
        else setError(e.message);
      });
  }, [navigate, onLogin]);

  return (
    <CenteredCard title={error ? "Kirib boʻlmadi" : "Kirilmoqda…"}>
      {error ? <p className="text-sm text-danger">{error}</p> : <div className="skeleton mx-auto h-3 w-32" />}
    </CenteredCard>
  );
}
