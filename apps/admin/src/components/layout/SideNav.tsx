import { dashboardBadges } from "@samarqand/shared";
import { NavLink } from "react-router-dom";
import { useDashboard } from "../../lib/dashboard";
import type { NavGroup } from "./nav";

/** Bo'limlar ro'yxati: yon panelda ham, telefondagi menyuda ham bir xil */
export function SideNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const d = useDashboard();
  const badges = d.data ? dashboardBadges(d.data) : {};
  return (
    <nav aria-label="Boʻlimlar" className="space-y-4">
      {groups.map((g) => (
        <div key={g.title} className="space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-hint">{g.title}</p>
          {g.items.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onNavigate}
              className={({ isActive }) =>
                `tap flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${
                  isActive ? "bg-brand text-white" : "text-text hover:bg-hint/10"
                }`
              }
            >
              <Icon size={18} /> <span className="flex-1">{label}</span>
              {(badges[to] ?? 0) > 0 && (
                <span
                  className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white tabular-nums"
                  aria-hidden="true"
                >
                  {badges[to]}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
