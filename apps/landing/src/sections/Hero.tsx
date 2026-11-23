import { CheckCircle2, ClipboardCheck, Flame, Trophy } from "lucide-react";
import { BotButton } from "./BotButton";

const POINTS = ["Ilova oʻrnatish shart emas", "Bepul darslar bilan boshlang", "Ota-ona nazorati"];

/** Telefon ko'rinishi: faqat bo'limlar nomi, raqam yoki ism yo'q */
function PhoneMock() {
  const rows = [
    { Icon: Flame, title: "Ketma-ket kunlar", sub: "Har kuni ozgina" },
    { Icon: ClipboardCheck, title: "Mavzu testi", sub: "Natija darhol" },
    { Icon: Trophy, title: "Haftalik reyting", sub: "Guruhdagi oʻrningiz" },
  ];
  return (
    <div
      aria-hidden
      className="mx-auto w-64 rounded-[2.5rem] border-8 border-text/80 bg-surface p-4 text-text shadow-2xl"
    >
      <div className="mb-4 flex items-center gap-2">
        <img src="/logo.jpg" alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
        <div className="h-2.5 w-24 rounded bg-hint/30" />
      </div>
      <div className="space-y-3">
        {rows.map(({ Icon, title, sub }) => (
          <div key={title} className="flex items-center gap-3 rounded-2xl bg-section p-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Icon size={20} />
            </span>
            <div>
              <p className="text-sm font-bold">{title}</p>
              <p className="text-xs text-hint">{sub}</p>
            </div>
          </div>
        ))}
        <div className="rounded-2xl bg-brand p-3 text-center text-sm font-bold text-white">
          Testni boshlash
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="bg-brand text-white">
      <div className="wrap grid items-center gap-10 py-14 md:grid-cols-[1.3fr_1fr] md:py-20">
        <div className="space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
            Matematikani tizimli oʻrganing, imtihonga ishonch bilan boring
          </h1>
          <p className="max-w-xl text-lg text-white/90">
            Darslar, mavzu testlari, haftalik reyting, mock imtihon va AI yordamchi bir joyda. Hammasi
            Telegram ichida, ustoz nazoratida.
          </p>
          <div className="flex flex-wrap gap-3">
            <BotButton light />
            <a href="#imkoniyatlar" className="btn border border-white/40 text-white">
              Imkoniyatlar
            </a>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/90">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-1.5">
                <CheckCircle2 size={16} aria-hidden /> {p}
              </li>
            ))}
          </ul>
        </div>
        <PhoneMock />
      </div>
    </section>
  );
}
