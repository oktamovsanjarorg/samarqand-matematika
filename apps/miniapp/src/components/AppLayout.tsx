import { BookOpen, Home, User } from "lucide-react";
import { Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../store/auth";

const TABS = [
  { to: "/lessons", label: "Darslar", Icon: BookOpen },
  { to: "/", label: "Asosiy", Icon: Home },
  { to: "/profile", label: "Profil", Icon: User },
];

/** Pastki navigatsiya: 3 tab, o'rtadagisi "Asosiy" (docs/11-ux.md) */
export function AppLayout() {
  // Ota-onaga darslar kerak emas (hammasi yopiq ko'rinardi): faqat Asosiy va Profil (T-070)
  const isParent = useAuth((s) => s.user?.role === "PARENT");
  const tabs = isParent ? TABS.filter((t) => t.to !== "/lessons") : TABS;
  return (
    <div className="flex h-full flex-col pt-safe-top">
      <main className="flex-1 overflow-y-auto p-4">
        {/* T-131: lazy sahifa yuklanguncha navigatsiya joyida qoladi */}
        <Suspense fallback={<div className="skeleton h-64" aria-busy="true" />}>
          <Outlet />
        </Suspense>
      </main>
      <nav
        className={`grid ${isParent ? "grid-cols-2" : "grid-cols-3"} border-t border-hint/15 bg-section pb-safe-bottom`}
      >
        {tabs.map(({ to, label, Icon }) => (
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
