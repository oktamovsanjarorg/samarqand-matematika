import {
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  CreditCard,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

const LINKS: { to: string; icon: LucideIcon; title: string; hint: string }[] = [
  { to: "/mistakes", icon: RotateCcw, title: "Xatolarim", hint: "Xato ishlangan savollar: yechimi bilan" },
  { to: "/weekly", icon: CalendarCheck, title: "Haftalik testlar", hint: "Ball va oʻrin, yopilgandan keyin" },
  { to: "/mocks", icon: ClipboardList, title: "Mock va offline imtihonlar", hint: "Barcha natijalar" },
  { to: "/billing", icon: CreditCard, title: "Obuna va toʻlovlar", hint: "Tarif, chek, muddat" },
];

/** Profil: natijalar tarixi va obunaga havolalar (T-065) */
export function HistoryLinks() {
  return (
    <nav className="card divide-y divide-hint/10 py-1" aria-label="Natijalar tarixi">
      {LINKS.map((l) => (
        <Link key={l.to} to={l.to} className="tap flex items-center gap-3 py-3">
          <l.icon size={20} className="shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{l.title}</p>
            <p className="text-xs text-hint">{l.hint}</p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-hint" />
        </Link>
      ))}
    </nav>
  );
}
