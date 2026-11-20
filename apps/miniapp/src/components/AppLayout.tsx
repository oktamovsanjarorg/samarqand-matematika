import { BookOpen, Home, User } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const TABS = [
  { to: "/lessons", label: "Darslar", Icon: BookOpen },
  { to: "/", label: "Asosiy", Icon: Home },
  { to: "/profile", label: "Profil", Icon: User },
];

/** Pastki navigatsiya: 3 tab, o'rtadagisi "Asosiy" (docs/11-ux.md) */
export function AppLayout() {
  return (
    <div className="flex h-full flex-col pt-safe-top">
      <main className="flex-1 overflow-y-auto p-4">
        <Outlet />
      </main>
      <nav className="grid grid-cols-3 border-t border-hint/15 bg-section pb-safe-bottom">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `tap flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                isActive ? "text-brand" : "text-hint"
              }`
            }
          >
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
