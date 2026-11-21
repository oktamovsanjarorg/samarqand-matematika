import { ROLE_LABELS } from "@samarqand/shared";
import { LogOut, Menu, X } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import type { Session } from "../lib/session";
import { navGroups, type NavGroup } from "./layout/nav";
import { SideNav } from "./layout/SideNav";
import { SkeletonList } from "./ui";

function Brand({ session }: { session: Session }) {
  return (
    <div className="flex items-center gap-3">
      <img src="/admin/logo.jpg" alt="" className="h-10 w-10 rounded-lg" />
      <div className="min-w-0">
        <p className="font-extrabold leading-tight text-brand">Samarqand matematika</p>
        <p className="truncate text-xs text-hint">
          {session.user.firstName} · {ROLE_LABELS[session.user.role]}
        </p>
      </div>
    </div>
  );
}

function LogoutButton({ onLogout }: { onLogout: () => void }) {
  return (
    <button
      type="button"
      onClick={onLogout}
      className="tap flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-hint hover:bg-hint/10"
    >
      <LogOut size={18} /> Chiqish
    </button>
  );
}

function MobileMenu(p: { session: Session; groups: NavGroup[]; onLogout: () => void; onClose: () => void }) {
  const { session, groups, onLogout, onClose } = p;
  return (
    <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true" aria-label="Menyu">
      <button
        type="button"
        aria-label="Menyuni yopish"
        className="absolute inset-0 bg-text/40"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-section p-4 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <Brand session={session} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="tap flex h-10 w-10 items-center justify-center text-hint"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1">
          <SideNav groups={groups} onNavigate={onClose} />
        </div>
        <LogoutButton onLogout={onLogout} />
      </div>
    </div>
  );
}

/** Admin karkasi: kompyuterda chap yon panel, telefonda tepa panel va ochiladigan menyu */
export function AdminLayout({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const groups = navGroups(session.user.role);
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-hint/15 bg-section p-4 lg:flex">
        <Brand session={session} />
        <div className="flex-1">
          <SideNav groups={groups} />
        </div>
        <LogoutButton onLogout={onLogout} />
      </aside>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-hint/15 bg-section/95 px-4 py-2 backdrop-blur lg:hidden">
        <img src="/admin/logo.jpg" alt="" className="h-9 w-9 rounded-lg" />
        <p className="min-w-0 flex-1 truncate font-extrabold text-brand">Samarqand matematika</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menyu"
          aria-expanded={open}
          className="tap flex h-11 w-11 items-center justify-center rounded-xl text-text"
        >
          <Menu size={22} />
        </button>
      </header>
      {open && (
        <MobileMenu session={session} groups={groups} onLogout={onLogout} onClose={() => setOpen(false)} />
      )}
      <main className="mx-auto w-full max-w-5xl min-w-0 flex-1 p-4 lg:p-8">
        {/* T-132: lazy sahifa yuklanguncha menyu joyida qoladi */}
        <Suspense fallback={<SkeletonList rows={3} />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
