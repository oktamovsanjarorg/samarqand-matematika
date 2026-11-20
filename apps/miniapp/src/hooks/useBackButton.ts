import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { tg } from "../lib/telegram";

/** Ichki sahifada Telegram'ning "orqaga" tugmasini ko'rsatadi */
export function useBackButton(to: string) {
  const navigate = useNavigate();
  useEffect(() => {
    const back = tg?.BackButton;
    if (!back) return;
    const go = () => navigate(to);
    back.show();
    back.onClick(go);
    return () => {
      back.offClick(go);
      back.hide();
    };
  }, [navigate, to]);
}
