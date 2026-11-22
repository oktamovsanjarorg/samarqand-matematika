import { BADGES, type BadgeKey, type MyProgress } from "@samarqand/shared";
import { Crown, Flame, Footprints, Medal, Star, Zap, type LucideIcon } from "lucide-react";

const ICON: Record<BadgeKey, LucideIcon> = {
  "first-test": Footprints,
  "tests-10": Medal,
  "answers-100": Zap,
  "streak-7": Flame,
  "mastered-1": Star,
  "weekly-top3": Crown,
};

/** Nishonlar (T-169): olinganlari rangli, qolganlari qanday olinishi bilan */
export function Badges({ badges }: { badges: MyProgress["badges"] }) {
  const done = badges.filter((b) => b.done).length;
  return (
    <section className="card space-y-3" data-testid="badges">
      <h3 className="flex items-center justify-between font-bold">
        Yutuqlar
        <span className="text-sm font-semibold text-hint">
          {done}/{badges.length}
        </span>
      </h3>
      <ul className="grid grid-cols-3 gap-2">
        {badges.map((b) => {
          const Icon = ICON[b.key];
          const meta = BADGES[b.key];
          return (
            <li key={b.key} className="flex flex-col items-center gap-1 text-center" data-done={b.done}>
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  b.done ? "bg-accent/15 text-accent" : "bg-hint/10 text-hint/60"
                }`}
              >
                <Icon size={24} aria-hidden />
              </span>
              <span className={`text-xs font-bold leading-tight ${b.done ? "" : "text-hint"}`}>
                {meta.title}
              </span>
              {!b.done && <span className="text-[11px] leading-tight text-hint">{meta.hint}</span>}
              <span className="sr-only">{b.done ? "olingan" : "hali olinmagan"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
