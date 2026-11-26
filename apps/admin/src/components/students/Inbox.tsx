import type { AdminGroupRow, AdminStudentRow, AdminParentLink } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Inbox as InboxIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Newcomer } from "./Newcomer";

function Body(p: { news: AdminStudentRow[]; parents: number; groups: AdminGroupRow[] }) {
  return (
    <div className="max-h-[60vh] space-y-3 overflow-y-auto border-t border-accent/30 px-4 pb-4 pt-3">
      {p.news.length > 0 && (
        <>
          <p className="text-xs text-hint">
            Oʻquvchingiz boʻlsa, guruhiga qoʻshing yoki online oʻquvchi deb qabul qiling. Begona boʻlsa,
            bloklang yoki oʻchiring.
          </p>
          <ul className="space-y-2">
            {p.news.map((s) => (
              <Newcomer key={s.id} s={s} groups={p.groups.filter((g) => g.isActive)} />
            ))}
          </ul>
        </>
      )}
      {p.parents > 0 && (
        <Link to="/parents" className="block text-sm font-semibold text-link">
          Ota-ona soʻrovlari: {p.parents} ta kutmoqda →
        </Link>
      )}
    </div>
  );
}

/** «Ko'rib chiqish kerak»: botdan yangi kirganlar va ota-ona so'rovlari bitta joyda (T-185) */
export function Inbox({ groups, open: initial }: { groups: AdminGroupRow[]; open: boolean }) {
  const [open, setOpen] = useState(initial);
  const news = useQuery({
    queryKey: ["students", "new", ""],
    queryFn: () => api.get<AdminStudentRow[]>("/admin/students?filter=new&q="),
    refetchInterval: 30_000,
  });
  const parents = useQuery({
    queryKey: ["parent-links", "PENDING"],
    queryFn: () => api.get<AdminParentLink[]>("/admin/parent-links?status=PENDING"),
    refetchInterval: 30_000,
  });
  const n = news.data?.length ?? 0;
  const p = parents.data?.length ?? 0;
  if (!n && !p) return null;
  const parts = [n && `yangi kirganlar: ${n}`, p && `ota-ona soʻrovlari: ${p}`].filter(Boolean).join(" · ");
  return (
    <section className="rounded-2xl border border-accent/40 bg-accent/10" data-testid="inbox">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left"
      >
        <InboxIcon size={18} className="text-accent" />
        <span className="font-extrabold">Koʻrib chiqish kerak</span>
        <span className="rounded-full bg-danger px-2 text-xs font-bold text-white">{n + p}</span>
        <span className="w-full text-xs text-hint sm:w-auto sm:flex-1">{parts}</span>
        <ChevronDown size={18} className={`text-hint ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <Body news={news.data ?? []} parents={p} groups={groups} />}
    </section>
  );
}
