import { InlineKeyboard } from "grammy";

/** /start javobi: salomlashuv va Mini App'ni ochish tugmasi */
export function startMessage(opts: { firstName: string; brand: string; miniappUrl: string }) {
  const text = `Assalomu alaykum, ${opts.firstName}!\n\n${opts.brand} platformasiga xush kelibsiz. Darslar, testlar va natijalaringiz ilovada.`;
  const keyboard = new InlineKeyboard().webApp("📐 Ilovani ochish", opts.miniappUrl);
  return { text, keyboard };
}
