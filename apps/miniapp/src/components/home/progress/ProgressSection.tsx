import { useProgress } from "../../../lib/me";
import { ActivityCard } from "./ActivityCard";
import { Badges } from "./Badges";
import { ProgressTiles } from "./ProgressTiles";

/** Asosiy sahifada "Mening yutuqlarim" (T-169): faollik, o'zlashtirish, nishonlar */
export function ProgressSection() {
  const q = useProgress();
  if (!q.data) return q.isFetching ? <div className="skeleton h-48" aria-busy="true" /> : null;
  return (
    <section className="space-y-2" aria-labelledby="progress-h" data-testid="progress">
      <h2 id="progress-h" className="font-bold">
        Mening yutuqlarim
      </h2>
      <ActivityCard p={q.data} />
      <ProgressTiles p={q.data} />
      <Badges badges={q.data.badges} />
    </section>
  );
}
