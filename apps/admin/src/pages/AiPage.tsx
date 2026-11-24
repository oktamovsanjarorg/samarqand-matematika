import { Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { PageTitle, SkeletonList } from "../components/ui";
import { useAgentChat, useAgentStatus, type AiContext } from "../lib/agent";

const TABS = [
  { to: "/ai", label: "Buyruq va savol", end: true },
  { to: "/ai/chats", label: "Oʻquvchilar suhbatlari", end: false },
];

/** AI yordamchi (T-177): ustozning agenti va o'quvchilar suhbatlari bitta bo'limda */
export function AiPage() {
  const status = useAgentStatus();
  const agent = useAgentChat();
  // AI holati noma'lum bo'lsa ham suhbatlarni o'qish ishlaydi (BR-T04)
  const context: AiContext = { status, agent };
  return (
    <div className="space-y-4">
      <PageTitle title="AI yordamchi" />
      <nav aria-label="AI yordamchi" className="flex gap-1 rounded-xl bg-section p-1">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `tap flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 text-center text-sm font-semibold ${
                isActive ? "bg-brand text-white" : "text-hint"
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Suspense fallback={<SkeletonList rows={3} />}>
        <Outlet context={context} />
      </Suspense>
    </div>
  );
}
