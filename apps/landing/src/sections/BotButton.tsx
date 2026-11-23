import { Send } from "lucide-react";
import { APP_URL } from "../content";

/** Bot havolasi main.ts'da qo'yiladi (data-bot); skriptsiz ilova manzili ochiladi */
export function BotButton({ label = "Telegramʼda boshlash", light }: { label?: string; light?: boolean }) {
  return (
    <a
      href={`${APP_URL}/`}
      data-bot=""
      className={`btn ${light ? "bg-white text-brand" : "bg-brand text-white"}`}
    >
      <Send size={18} aria-hidden /> {label}
    </a>
  );
}
