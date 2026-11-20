import { ROLE_LABELS } from "@samarqand/shared";
import { BookOpen, CalendarCheck, CreditCard, LogOut, Settings, UserRound, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import type { Session } from "../lib/session";

const NAV = [
  { to: "/content", label: "Kontent", Icon: BookOpen },
  { to: "/weekly", label: "Haftalik", Icon: CalendarCheck },
  { to: "/students", label: "Oʻquvchilar", Icon: UserRound },
  { to: "/parents", label: "Ota-onalar", Icon: Users },
  { to: "/payments", label: "Toʻlovlar", Icon: CreditCard },
];
// BR-B05: tarif va karta faqat ustozda
const TEACHER_NAV = [{ to: "/settings", label: "Sozlamalar", Icon: Settings }];

export function AdminLayout({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const { user } = session;
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <header className="flex items-center gap-3">
        <img src="/admin/logo.jpg" alt="" className="h-10 w-10 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-brand">Samarqand matematika</p>
          <p className="truncate text-xs text-hint">
            {user.firstName} · {ROLE_LABELS[user.role]}
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="tap flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-hint"
        >
          <LogOut size={18} /> Chiqish
        </button>
      </header>
      <nav aria-label="Boʻlimlar" className="flex gap-1 overflow-x-auto rounded-xl bg-section p-1">
        {[...NAV, ...(user.role === "TEACHER" ? TEACHER_NAV : [])].map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `tap flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${
                isActive ? "bg-brand text-white" : "text-hint"
              }`
            }
          >
            <Icon size={16} /> {label}
          </NavLink>
        ))}
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
