import type { LandingInfo } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  GraduationCap,
  type LucideIcon,
  RotateCcw,
  Send,
  Trophy,
  Users,
} from "lucide-react";

const FEATURES: { Icon: LucideIcon; title: string; text: string }[] = [
  {
    Icon: BookOpen,
    title: "Darslar",
    text: "Mavzular boʻyicha konspekt va video, formulalar aniq koʻrinadi",
  },
  {
    Icon: ClipboardCheck,
    title: "Mavzu testlari",
    text: "Har mavzudan keyin oʻzingizni tekshiring, natija darhol",
  },
  {
    Icon: RotateCcw,
    title: "Xatolar ustida ishlash",
    text: "Notoʻgʻri javob bergan savollaringizni qayta yechasiz",
  },
  {
    Icon: Trophy,
    title: "Haftalik test va reyting",
    text: "Har hafta bitta test: ball va sinfdagi oʻrningiz",
  },
  { Icon: GraduationCap, title: "Mock imtihon", text: "Milliy sertifikat formatida sinov imtihonlari" },
  {
    Icon: BarChart3,
    title: "Shaxsiy tavsiyalar",
    text: "Qaysi mavzuni takrorlash kerakligini natijangiz koʻrsatadi",
  },
];

const STEPS = [
  "Pastdagi tugma bilan botni oching va «Start» ni bosing",
  "Ism-familiyangiz va telefon raqamingizni kiriting",
  "Ustoz sizni qabul qiladi. Ota-onangiz ulanib, toʻlov qilingach barcha darslar ochiladi (bepul darslar darhol)",
];

/** Bot havolasi bo'lmasa (API javob bermasa) tugma ko'rinmaydi, matn qoladi */
function OpenButton({ link, light }: { link: string | null | undefined; light?: boolean }) {
  if (!link) return null;
  return (
    <a
      href={link}
      className={`tap inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 font-bold ${
        light ? "bg-white text-brand" : "bg-brand text-white"
      }`}
    >
      <Send size={18} aria-hidden /> Telegramʼda ochish
    </a>
  );
}

function Stats({ c }: { c: LandingInfo["content"] }) {
  // Kontent hali kiritilmagan bo'lsa nol ko'rsatilmaydi
  if (c.lessons === 0 && c.questions === 0) return null;
  const items = [
    [c.topics, "mavzu"],
    [c.lessons, "dars"],
    [c.questions, "test savoli"],
  ] as const;
  return (
    <ul className="grid grid-cols-3 gap-2 text-center" aria-label="Platformada">
      {items.map(([n, label]) => (
        <li key={label} className="card px-2">
          <p className="text-2xl font-extrabold tabular-nums text-brand">{n}</p>
          <p className="text-sm text-hint">{label}</p>
        </li>
      ))}
    </ul>
  );
}

/** Imkoniyatlar, ota-onalar va boshlash qadamlari */
function Sections() {
  return (
    <>
      <section aria-labelledby="f" className="space-y-3">
        <h2 id="f" className="text-xl font-extrabold">
          Oʻquvchi uchun
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {FEATURES.map(({ Icon, title, text }) => (
            <li key={title} className="card flex gap-3">
              <Icon size={22} className="mt-0.5 shrink-0 text-brand" aria-hidden />
              <div>
                <p className="font-bold">{title}</p>
                <p className="text-sm text-hint">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="p" className="card space-y-2">
        <h2 id="p" className="flex items-center gap-2 text-xl font-extrabold">
          <Users size={22} className="text-brand" aria-hidden /> Ota-onalar uchun
        </h2>
        <p>
          Farzandingiz test natijalari, darsga kelgan-kelmagani va toʻlov muddati haqida Telegram orqali xabar
          olasiz. Ulanish uchun farzandingiz ilovadagi profilidan havola yuboradi.
        </p>
      </section>

      <section aria-labelledby="s" className="space-y-3">
        <h2 id="s" className="flex items-center gap-2 text-xl font-extrabold">
          <CalendarCheck size={22} className="text-brand" aria-hidden /> Qanday boshlash
        </h2>
        <ol className="space-y-2">
          {STEPS.map((s, i) => (
            <li key={s} className="card flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-white">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

/**
 * Landing (T-166): sayt Telegram'dan tashqarida (oddiy brauzerda) ochilganda.
 * Telegram ichida ilovaning o'zi ochiladi. Ustoz ismi va shaxsiy ma'lumot yozilmaydi.
 */
export function LandingPage() {
  const info = useQuery({
    queryKey: ["landing"],
    queryFn: async (): Promise<LandingInfo> => {
      const res = await fetch("/api/public/landing");
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as LandingInfo;
    },
    retry: false,
  });
  const link = info.data?.botLink;
  return (
    <div className="min-h-full bg-bg">
      <main className="mx-auto max-w-3xl space-y-10 px-4 pb-10 pt-8">
        <header className="flex flex-col items-center gap-4 text-center">
          <img src="/logo.jpg" alt="Samarqand matematika logotipi" className="h-24 w-24 rounded-card" />
          <h1 className="text-3xl font-extrabold text-brand">Samarqand matematika</h1>
          <p className="max-w-xl text-lg">
            Matematikadan imtihon va milliy sertifikatga tayyorgarlik: darslar, testlar va haftalik reyting
            bir joyda, Telegram ichida.
          </p>
          <OpenButton link={link} />
          <p className="text-sm text-hint">Alohida ilova oʻrnatish shart emas: Telegram boʻlsa yetarli</p>
        </header>

        {info.data && <Stats c={info.data.content} />}

        <Sections />

        <section className="flex flex-col items-center gap-3 rounded-card bg-brand p-6 text-center text-white">
          <p className="text-lg font-bold">Bugun boshlang</p>
          <OpenButton link={link} light />
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-hint/20 pt-4 text-sm text-hint">
          <span>© {new Date().getFullYear()} Samarqand matematika</span>
        </footer>
      </main>
    </div>
  );
}
