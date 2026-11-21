import { NavLink } from "react-router-dom";
import type { NavGroup } from "./nav";

/** Bo'limlar ro'yxati: yon panelda ham, telefondagi menyuda ham bir xil */
export function SideNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  return (
    <nav aria-label="Boʻlimlar" className="space-y-4">
      {groups.map((g) => (
        <div key={g.title} className="space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-hint">{g.title}</p>
          {g.items.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `tap flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${
                  isActive ? "bg-brand text-white" : "text-text hover:bg-hint/10"
                }`
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
