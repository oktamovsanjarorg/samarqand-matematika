import { describe, expect, it } from "vitest";
import {
  aiAdvice,
  draftAdvice,
  noTestTopicsAdvice,
  participationAdvice,
  weakTopicAdvice,
  weeklyPlanAdvice,
  type AnswerRow,
} from "../src/advisor/advice";

/** n ta o'quvchi, har biri k ta javob, jami ok ta to'g'ri (birinchilari) */
function answers(topicId: string, users: number, perUser: number, ok: number): AnswerRow[] {
  const rows: AnswerRow[] = [];
  for (let u = 0; u < users; u++)
    for (let i = 0; i < perUser; i++) rows.push({ topicId, userId: `u${u}`, correct: rows.length < ok });
  return rows;
}
const titles = new Map([
  ["t1", "Kasrlar"],
  ["t2", "Tenglama"],
  ["t3", "Foiz"],
]);

describe("Maslahatchi qoidalari (T-161, BR-R03)", () => {
  it("sinf qiynalayotgan mavzu: 3 o'quvchi, 15 javob, 50% dan past; eng qiyini birinchi, ko'pi bilan 2 ta", () => {
    const r = weakTopicAdvice(
      [...answers("t1", 3, 5, 7), ...answers("t2", 3, 5, 4), ...answers("t3", 3, 5, 6)],
      titles,
    );
    expect(r.map((a) => a.key)).toEqual(["weak:t2", "weak:t3"]);
    expect(r[0]?.title).toBe("«Tenglama» mavzusida sinf qiynalyapti");
    expect(r[0]?.why).toContain("3 oʻquvchining 15 ta javobidan faqat 27% toʻgʻri");
    expect(r[0]?.action).toEqual({ label: "Mavzu savollari", to: "/content/topics/t2/questions" });
  });

  it("chegaralar: 50% maslahat emas, 49% maslahat; 2 o'quvchi yoki 14 javob yetarli emas", () => {
    expect(weakTopicAdvice(answers("t1", 4, 5, 10), titles)).toEqual([]);
    expect(weakTopicAdvice([...answers("t1", 4, 25, 49), ...answers("t1", 0, 0, 0)], titles)).toHaveLength(1);
    expect(weakTopicAdvice(answers("t1", 2, 10, 0), titles)).toEqual([]);
    expect(weakTopicAdvice(answers("t1", 3, 5, 0).slice(1), titles)).toEqual([]);
  });

  it("haftalik test rejalashtirilmagan: faqat o'quvchi bo'lsa va oldinda test yo'q bo'lsa", () => {
    expect(weeklyPlanAdvice({ planned: false, students: 12 })[0]).toMatchObject({
      level: "urgent",
      action: { to: "/weekly/new" },
    });
    expect(weeklyPlanAdvice({ planned: false, students: 12 })[0]?.why).toContain("12 ta oʻquvchi");
    expect(weeklyPlanAdvice({ planned: true, students: 12 })).toEqual([]);
    expect(weeklyPlanAdvice({ planned: false, students: 0 })).toEqual([]);
  });

  it("darsi bor, testi yo'q mavzular: birinchi uchtasi nomi bilan, havola birinchisiga", () => {
    const topics = [
      { id: "a", title: "A", lessons: 1, questions: 0 },
      { id: "b", title: "B", lessons: 0, questions: 0 },
      { id: "c", title: "C", lessons: 2, questions: 5 },
      { id: "d", title: "D", lessons: 1, questions: 0 },
      { id: "e", title: "E", lessons: 1, questions: 0 },
      { id: "f", title: "F", lessons: 3, questions: 0 },
    ];
    const [a] = noTestTopicsAdvice(topics);
    expect(a?.title).toBe("4 ta mavzuda dars bor, lekin test yoʻq");
    expect(a?.why).toMatch(/^«A», «D», «E» va boshqalar:/);
    expect(a?.action?.to).toBe("/content/topics/a/questions");
    expect(noTestTopicsAdvice(topics.slice(1, 3))).toEqual([]);
  });

  it("qatnashish: 4 tadan kam o'quvchida yoki 50% va undan ko'pida jim; yordamchiga e'lon havolasi yo'q", () => {
    const w = { title: "48-hafta", submitted: 4, eligible: 10 };
    expect(participationAdvice(w, true)[0]?.action).toEqual({ label: "Eʼlon yuborish", to: "/broadcast" });
    expect(participationAdvice(w, false)[0]?.action).toEqual({ label: "Haftalik testlar", to: "/weekly" });
    expect(participationAdvice(w, true)[0]?.title).toBe("«48-hafta» ni faqat 4/10 oʻquvchi topshirgan");
    expect(participationAdvice({ ...w, submitted: 5 }, true)).toEqual([]);
    expect(participationAdvice({ ...w, submitted: 0, eligible: 3 }, true)).toEqual([]);
    expect(participationAdvice(null, true)).toEqual([]);
  });

  it("qoralamalar: 0 bo'lsa jim", () => {
    expect(draftAdvice(0)).toEqual([]);
    expect(draftAdvice(7)[0]).toMatchObject({ level: "info", title: "7 ta savol qoralamada qolib ketgan" });
  });

  it("AI ishlamayapti (T-163): pul/kalit darhol; tarmoq xatosi 15 daqiqadan keyin", () => {
    const now = new Date("2026-11-22T12:00:00Z");
    const ago = (m: number) => new Date(now.getTime() - m * 60_000);
    expect(aiAdvice(null, now)).toEqual([]);
    const [pay] = aiAdvice({ since: ago(0), status: 402 }, now);
    expect(pay).toMatchObject({ key: "ai:down", level: "urgent", action: null });
    expect(pay?.title).toBe("AI ishlamayapti: AI hisobida mablagʻ tugagan: hisobni toʻldirish kerak");
    expect(aiAdvice({ since: ago(0), status: 401 }, now)[0]?.title).toContain("kaliti");
    expect(aiAdvice({ since: ago(14), status: 0 }, now)).toEqual([]);
    expect(aiAdvice({ since: ago(15), status: 503 }, now)[0]?.why).toMatch(/^15 daqiqadan beri/);
    expect(aiAdvice({ since: ago(150), status: 0 }, now)[0]?.why).toMatch(/^2 soatdan beri/);
  });
});
