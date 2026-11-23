import "@fontsource-variable/manrope";
import "./style.css";

/**
 * Bot havolasi API'dan olinadi (bot nomi .env'da). Olinmasa tugmalar ilova manziliga qoladi:
 * u yerda ham "Telegram'da ochish" tugmasi bor.
 */
async function setBotLinks(): Promise<void> {
  const res = await fetch("/api/public/landing");
  if (!res.ok) return;
  const { botLink } = (await res.json()) as { botLink: string | null };
  if (!botLink) return;
  document.querySelectorAll<HTMLAnchorElement>("a[data-bot]").forEach((a) => (a.href = botLink));
}

void setBotLinks().catch(() => undefined);
