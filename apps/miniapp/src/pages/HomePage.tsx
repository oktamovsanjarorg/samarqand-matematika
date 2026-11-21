import type { MyStats } from "@samarqand/shared";
import { Bot, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { AccessCard } from "../components/home/AccessCard";
import { Hero } from "../components/home/Hero";
import { Recommendations } from "../components/home/Recommendations";
import { RecentResults } from "../components/home/RecentResults";
import { MockRow } from "../components/mock/MockRow";
import { WeeklyRow } from "../components/weekly/WeeklyRow";
import { useProfile, useStats } from "../lib/me";
import { useMockList } from "../lib/mock";
import { useWeeklyList } from "../lib/weekly";
import { useAuth } from "../store/auth";

function ContinueCard({ open }: { open: NonNullable<MyStats["open"]> }) {
  return (
    <Link
      to={`/topics/${open.topicId}/test`}
      className="tap card flex items-center gap-3 border-2 border-brand/30"
      data-testid="continue"
    >
      <PlayCircle size={28} className="shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">Testni davom ettiring</p>
        <p className="truncate text-sm text-hint">
          {open.topicTitle} · {open.answered}/{open.total} javob
        </p>
      </div>
    </Link>
  );
}

function StatsBlock({ stats }: { stats: MyStats }) {
  return (
    <>
      {stats.open && <ContinueCard open={stats.open} />}
      {stats.recent.length > 0 && <RecentResults items={stats.recent} />}
      {!stats.open && stats.tests === 0 && <FirstStep />}
    </>
  );
}

function FirstStep() {
  return (
    <Link to="/lessons" className="tap card block text-center" data-testid="first-step">
      <p className="font-bold">Birinchi mavzu testini ishlang</p>
      <p className="mt-1 text-sm text-hint">
        Darslar boʻlimida mavzuni tanlang. Natijalar shu yerda chiqadi.
      </p>
    </Link>
  );
}

/** Joriy haftalik test (ochiq bo'lsa birinchi) va barcha testlarga havola */
function WeeklyBlock() {
  const list = useWeeklyList();
  const now = new Date();
  const current = list.data?.find((t) => t.status === "OPEN") ?? list.data?.[0];
  if (!current) return null;
  return (
    <section className="space-y-2" data-testid="weekly-home">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Haftalik test</h2>
        <Link to="/weekly" className="text-sm font-semibold text-link">
          Barchasi
        </Link>
      </div>
      <WeeklyRow t={current} now={now} highlight />
    </section>
  );
}

/** Ochiq yoki yaqin mock (bo'lsa) va barcha mocklarga havola */
function MockBlock() {
  const list = useMockList();
  const current =
    list.data?.find((t) => t.status === "OPEN" && !t.my.submitted) ??
    list.data?.find((t) => t.status === "UPCOMING");
  if (!list.data?.length) return null;
  return (
    <section className="space-y-2" data-testid="mock-home">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Mock imtihon</h2>
        <Link to="/mocks" className="text-sm font-semibold text-link">
          Barchasi
        </Link>
      </div>
      {current && <MockRow t={current} now={new Date()} />}
    </section>
  );
}

/** Erkin savol uchun yordamchi (o'quvchiga) */
function TutorCard() {
  return (
    <Link to="/tutor" className="tap card flex items-center gap-3" data-testid="tutor-home">
      <Bot size={28} className="shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">AI yordamchi</p>
        <p className="text-sm text-hint">Mavzu boʻyicha savol ber: javobni emas, yoʻlni koʻrsatadi</p>
      </div>
    </Link>
  );
}

export function HomePage() {
  const user = useAuth((s) => s.user);
  const profile = useProfile();
  const stats = useStats();
  const weekly = useWeeklyList();
  const name = profile.data?.fullName?.split(" ")[0] ?? user?.firstName;

  return (
    <div className="space-y-4">
      <Hero name={name} stats={stats.data} weekly={weekly.data} />
      {profile.data && <AccessCard access={profile.data.access} />}
      <WeeklyBlock />
      <MockBlock />
      {stats.fetchStatus === "fetching" && !stats.data && <div className="skeleton h-24" aria-busy="true" />}
      {stats.data && <StatsBlock stats={stats.data} />}
      <Recommendations />
      {user?.role === "STUDENT" && <TutorCard />}
    </div>
  );
}
