import { BotButton } from "./BotButton";

const NAV = [
  ["#imkoniyatlar", "Imkoniyatlar"],
  ["#qanday", "Qanday boshlash"],
  ["#ota-onalar", "Ota-onalar"],
  ["#savollar", "Savollar"],
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-hint/15 bg-bg/90 backdrop-blur">
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <a href="/" className="flex items-center gap-2 font-extrabold text-brand">
          <img src="/logo.jpg" alt="" width={36} height={36} className="h-9 w-9 rounded-lg" />
          Samarqand matematika
        </a>
        <nav aria-label="Boʻlimlar" className="hidden gap-6 text-sm font-semibold md:flex">
          {NAV.map(([href, label]) => (
            <a key={href} href={href} className="hover:text-brand">
              {label}
            </a>
          ))}
        </nav>
        <div className="hidden sm:block">
          <BotButton label="Boshlash" />
        </div>
      </div>
    </header>
  );
}
