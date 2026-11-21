import { WEAK_MIN_ANSWERS, WEAK_PERCENT, type InsightSource } from "@samarqand/shared";

export interface AnswerFact {
  topicId: string;
  skills: string[];
  correct: boolean;
  source: InsightSource;
}

export interface TopicWeakness {
  topicId: string;
  correct: number;
  total: number;
  percent: number;
  sources: Record<InsightSource, number>;
  weakSkills: string[];
}

const topSkills = (counts: Map<string, number>) =>
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([s]) => s);

/** Mavzu bo'yicha to'g'ri ulush; kamida 3 javob va 60% dan past bo'lsa kuchsiz. Eng pasti birinchi */
export function weakTopics(facts: AnswerFact[], limit = 3): TopicWeakness[] {
  const by = new Map<
    string,
    { correct: number; total: number; sources: Record<InsightSource, number>; miss: Map<string, number> }
  >();
  for (const f of facts) {
    const t = by.get(f.topicId) ?? {
      correct: 0,
      total: 0,
      sources: { topic: 0, weekly: 0, mock: 0 },
      miss: new Map(),
    };
    t.total++;
    t.sources[f.source]++;
    if (f.correct) t.correct++;
    else for (const s of f.skills) t.miss.set(s, (t.miss.get(s) ?? 0) + 1);
    by.set(f.topicId, t);
  }
  return [...by.entries()]
    .map(([topicId, t]) => ({
      topicId,
      correct: t.correct,
      total: t.total,
      percent: Math.round((t.correct / t.total) * 100),
      sources: t.sources,
      weakSkills: topSkills(t.miss),
    }))
    .filter((t) => t.total >= WEAK_MIN_ANSWERS && t.percent < WEAK_PERCENT)
    .sort((a, b) => a.percent - b.percent || b.total - a.total)
    .slice(0, limit);
}
