import { useAuth } from "../store/auth";
import { EmptyState } from "../components/states";

export function HomePage() {
  const user = useAuth((s) => s.user);
  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-3">
        <img src="/logo.jpg" alt="" className="h-12 w-12 rounded-xl" />
        <div>
          <p className="text-sm text-hint">Assalomu alaykum</p>
          <h1 className="text-lg font-extrabold text-brand">{user?.firstName}</h1>
        </div>
      </div>
      <EmptyState title="Bugungi vazifa" hint="Ustoz birinchi darsni joylagach, shu yerda koʻrinadi." />
    </div>
  );
}
