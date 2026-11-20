import type { SolutionVerdict } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testAi } from "./helpers";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(() => f.cleanup());

const verdict = (v: Partial<SolutionVerdict>): SolutionVerdict => ({
  verdict: "SOLVED_CORRECTLY",
  confidence: "HIGH",
  answerFollows: true,
  steps: [],
  copySignals: [],
  teacherNote: "",
  studentFeedback: "",
  ...v,
});

/** Test: o'quvchi 1-savolga rasm bilan javob beradi, 2-savolga rasmsiz, topshiradi */
async function submitted() {
  const qids = await f.questions();
  const [q0 = "", q1 = ""] = qids;
  const id = await f.weekly(qids);
  const s = await f.student();
  const a = (await f.call("POST", `/weekly/${id}/attempts`, s.headers)).json();
  await f.call("PUT", `/weekly-attempts/${a.id}/answers/${q0}`, s.headers, { response: { optionId: "b" } });
  await f.call("PUT", `/weekly-attempts/${a.id}/answers/${q1}`, s.headers, { response: { value: "1/2" } });
  expect((await f.photo(s.headers, { attemptId: a.id, qid: q0 })).statusCode).toBe(201);
  await f.call("POST", `/weekly-attempts/${a.id}/submit`, s.headers);
  return { id, s, attemptId: a.id as string, q0, q1 };
}

const review = (attemptId: string, questionId: string) =>
  f.prisma.aiReview.findUnique({ where: { attemptId_questionId: { attemptId, questionId } } });

describe("AI yechim tekshiruvi navbati (T-033)", () => {
  it("BR-W06: faqat rasmli savol navbatga; AI'ga savol, etalon, javoblar va rasm boradi; hukm saqlanadi", async () => {
    const t = await submitted();
    expect(await review(t.attemptId, t.q1)).toBeNull();
    expect((await review(t.attemptId, t.q0))?.status).toBe("PENDING");
    testAi.respond = (i) => (i.studentAnswer === "B) 2" ? verdict({ teacherNote: "Toʻgʻri" }) : null);
    await f.tick();
    const call = testAi.calls.find((c) => c.studentAnswer === "B) 2");
    expect(call).toMatchObject({ question: "1+1?", correctAnswer: "B) 2" });
    expect(call?.photos[0]?.type).toBe("image/png");
    const r = await review(t.attemptId, t.q0);
    expect(r).toMatchObject({ status: "DONE", suspected: false, provider: "test", tries: 1 });
    expect((r?.verdict as SolutionVerdict).teacherNote).toBe("Toʻgʻri");
  });

  it("BR-W05: ko'chirish shubhasi ustozga belgilanadi, o'quvchi natijasida AI izi yo'q", async () => {
    const t = await submitted();
    testAi.respond = () =>
      verdict({ verdict: "WRONG", copySignals: ["ANSWER_NOT_DERIVED", "SKIPPED_STEPS"] });
    await f.tick();
    expect((await review(t.attemptId, t.q0))?.suspected).toBe(true);
    await f.prisma.weeklyTest.update({
      where: { id: t.id },
      data: { closesAt: new Date(Date.now() - 1000) },
    });
    const body = (await f.call("GET", `/weekly-attempts/${t.attemptId}`, t.s.headers)).body;
    expect(body).toContain('"status":"RESULT"');
    for (const word of ["suspected", "verdict", "copySignals", "teacherNote", "ANSWER_NOT_DERIVED"])
      expect(body).not.toContain(word);
  });

  it("AI javob bermasa 3 martagacha qayta urinadi, keyin to'xtaydi (oqim AI'siz davom etadi)", async () => {
    const t = await submitted();
    testAi.respond = () => null;
    for (let i = 0; i < 4; i++) await f.tick();
    expect(await review(t.attemptId, t.q0)).toMatchObject({ status: "FAILED", tries: 3 });
  });
});
