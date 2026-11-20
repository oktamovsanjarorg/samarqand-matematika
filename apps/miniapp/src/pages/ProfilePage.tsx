import { ROLE_LABELS, type MyStats } from "@samarqand/shared";
import { Link } from "react-router-dom";
import { useProfile, useStats } from "../lib/me";
import { useAuth } from "../store/auth";

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card flex-1 text-center">
      <p className="text-2xl font-extrabold text-brand">{value}</p>
      <p className="text-xs text-hint">{label}</p>
    </div>
  );
}

const barTone = (p: number) => (p >= 80 ? "bg-success" : p >= 60 ? "bg-brand" : "bg-danger");

/** Mavzular: eng yaxshi natija, pasti birinchi — qayta ishlash uchun */
function Topics({ topics }: { topics: MyStats["topics"] }) {
  return (
    <section className="card space-y-3" data-testid="topics">
      <h2 className="font-bold">Mavzular boʻyicha</h2>
      {topics.map((t) => (
        <Link key={t.topicId} to={`/topics/${t.topicId}/test`} className="tap block space-y-1">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate font-semibold">{t.topicTitle}</span>
            <span className="text-xs text-hint">{t.attempts} marta</span>
            <span className="w-10 text-right font-bold">
              {t.bestPercent === null ? "—" : `${t.bestPercent}%`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-hint/15">
            <div
              className={`h-full rounded-full ${barTone(t.bestPercent ?? 0)}`}
              style={{ width: `${t.bestPercent ?? 0}%` }}
            />
          </div>
        </Link>
      ))}
      <p className="text-xs text-hint">Eng yaxshi natija. 60% dan past mavzuni qayta ishlang.</p>
    </section>
  );
}

export function ProfilePage() {
  const user = useAuth((s) => s.user);
  const profile = useProfile();
  const stats = useStats().data;
  if (!user) return null;
  const name = profile.data?.fullName ?? [user.firstName, user.lastName].filter(Boolean).join(" ");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Profil</h1>
      <div className="card">
        <p className="font-bold">{name}</p>
        <p className="text-sm text-hint">{ROLE_LABELS[user.role]}</p>
      </div>
      {stats && (
        <div className="flex gap-3" data-testid="tiles">
          <Tile label="Topshirilgan test" value={String(stats.tests)} />
          <Tile
            label="Oʻrtacha natija"
            value={stats.averagePercent === null ? "—" : `${stats.averagePercent}%`}
          />
        </div>
      )}
      {stats && stats.topics.length > 0 && <Topics topics={stats.topics} />}
    </div>
  );
}
