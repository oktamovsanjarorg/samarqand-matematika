import { ROLE_LABELS } from "@samarqand/shared";
import { LogOut } from "lucide-react";
import type { Session } from "../lib/session";

export function HomePage({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const { user } = session;
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <header className="flex items-center gap-3">
        <img src="/admin/logo.jpg" alt="" className="h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <p className="font-extrabold text-brand">Samarqand matematika</p>
          <p className="text-xs text-hint">
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
      <div className="card">
        <p className="font-bold">Xush kelibsiz!</p>
        <p className="mt-1 text-sm text-hint">
          Boʻlimlar (kontent, savollar banki, testlar) keyingi vazifalarda qoʻshiladi.
        </p>
      </div>
    </div>
  );
}
