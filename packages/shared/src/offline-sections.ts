import { z } from "zod";

/**
 * Offline testning fan bo'limlari (T-180): bo'lim nomi va unga tegishli savol raqamlari (1 dan).
 * Ustoz yozadi ("Algebra: 1-10, 31"), skaner eksportida savol turlari bo'yicha bo'limlar ham keladi.
 * Bitta savol ko'pi bilan bitta bo'limda; hamma savol bo'limda bo'lishi shart emas.
 */
export const offlineSection = z.object({
  title: z.string().trim().min(1, "Boʻlim nomi kerak").max(100),
  questions: z.array(z.number().int().min(1)).min(1, "Boʻlimda savol yoʻq").max(200),
});
export type OfflineSection = z.infer<typeof offlineSection>;

export const offlineSections = z
  .array(offlineSection)
  .max(30, "Koʻpi bilan 30 ta boʻlim")
  .superRefine((list, ctx) => {
    const seen = new Map<number, string>();
    list.forEach((s, i) =>
      s.questions.forEach((q) => {
        const other = seen.get(q);
        if (other !== undefined)
          ctx.addIssue({
            code: "custom",
            path: [i, "questions"],
            message: `${q}-savol ikki boʻlimda: «${other}» va «${s.title}»`,
          });
        seen.set(q, s.title);
      }),
    );
  });

/** "1-5, 12, 33–35" → [1..5, 12, 33, 34, 35] */
export function parseQuestionList(text: string): number[] {
  const out: number[] = [];
  for (const part of text.split(/[,;\s]+/).filter(Boolean)) {
    const m = /^(\d+)(?:\s*[-–]\s*(\d+))?$/.exec(part);
    if (!m) throw new Error(`Savol raqami tushunilmadi: «${part}»`);
    const a = Number(m[1]);
    const b = Number(m[2] ?? m[1]);
    if (b < a) throw new Error(`Oraliq teskari: «${part}»`);
    for (let q = a; q <= b; q++) if (!out.includes(q)) out.push(q);
  }
  return out.sort((x, y) => x - y);
}

/** [1,2,3,5] → "1–3, 5" */
export function formatQuestionList(qs: number[]): string {
  const sorted = [...qs].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length;) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === (sorted[j] ?? 0) + 1) j++;
    parts.push(i === j ? `${sorted[i]}` : `${sorted[i]}–${sorted[j]}`);
    i = j + 1;
  }
  return parts.join(", ");
}

/**
 * Ustoz matni: har qatorda "Bo'lim nomi: 1-10, 31". Bo'sh qatorlar o'tkaziladi.
 * Savol soni ma'lum bo'lsa undan katta raqam xato.
 */
export function parseSectionsText(text: string, questionCount?: number): OfflineSection[] {
  const list = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const at = line.lastIndexOf(":");
      if (at <= 0) throw new Error(`${i + 1}-qator: «Nom: 1-10» koʻrinishida yozing`);
      const questions = parseQuestionList(line.slice(at + 1));
      const big = questions.find((q) => questionCount !== undefined && q > questionCount);
      if (big !== undefined) throw new Error(`${i + 1}-qator: testda ${questionCount} ta savol, ${big} yoʻq`);
      return { title: line.slice(0, at).trim(), questions };
    });
  const r = offlineSections.safeParse(list);
  if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Boʻlimlar notoʻgʻri");
  return r.data;
}

export const sectionsToText = (list: OfflineSection[]) =>
  list.map((s) => `${s.title}: ${formatQuestionList(s.questions)}`).join("\n");

export interface OfflineSectionScore {
  title: string;
  questions: number[];
  correct: number;
  wrong: number;
  blank: number;
  max: number;
  percent: number;
  /** Test balidan shu bo'limga to'g'ri keladigan qism: yechilgan savollar og'irligi ulushi */
  points: number;
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Bo'limlar bo'yicha natija; og'irliklar Rasch'dan (yo'q bo'lsa hamma savol 1) */
export function sectionScores(
  sections: OfflineSection[],
  answers: string,
  score: number,
  weights: number[] = [],
): OfflineSectionScore[] {
  const w = (q: number) => weights[q - 1] ?? 1;
  const solved = (qs: number[]) => qs.reduce((s, q) => s + (answers[q - 1] === "c" ? w(q) : 0), 0);
  const all = solved([...answers].map((_, i) => i + 1));
  return sections.map((s) => {
    const marks = s.questions.map((q) => answers[q - 1] ?? "-");
    const correct = marks.filter((x) => x === "c").length;
    const blank = marks.filter((x) => x === "b" || x === "-").length;
    const max = marks.length;
    return {
      title: s.title,
      questions: s.questions,
      correct,
      wrong: max - correct - blank,
      blank,
      max,
      percent: max ? r1((correct / max) * 100) : 0,
      points: all ? r2((score * solved(s.questions)) / all) : 0,
    };
  });
}

/** Eng zaif bo'lim: foizi eng past (kamida 2 savolli bo'limlardan) */
export function weakestSection(list: OfflineSectionScore[]): OfflineSectionScore | null {
  const pool = list.filter((s) => s.max >= 2);
  return [...pool].sort((a, b) => a.percent - b.percent)[0] ?? null;
}

/** Rasch tahlili: har savol qiyinligi (logit, o'rtachasi 0), ball og'irligi va to'g'ri yechganlar ulushi */
export interface OfflineRasch {
  /** Qiyinlik shu natijalardan hisoblandimi (kamida 30 qatnashchi) */
  calibrated: boolean;
  n: number;
  items: { q: number; b: number; w: number; correctPct: number }[];
}
