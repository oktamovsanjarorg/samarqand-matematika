import type { ReviewQueue, SolutionVerdict } from "@samarqand/shared";
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

/** O'quvchi: 1-savol to'g'ri + rasm, 2-savol berilgan javob bilan (rasmsiz) */
async function solve(testId: string, q: string[], second: string) {
  const s = await f.student();
  const a = (await f.call("POST", `/weekly/${testId}/attempts`, s.headers)).json();
  await f.call("PUT", `/weekly-attempts/${a.id}/answers/${q[0]}`, s.headers, { response: { optionId: "b" } });
  await f.call("PUT", `/weekly-attempts/${a.id}/answers/${q[1]}`, s.headers, { response: { value: second } });
  await f.photo(s.headers, { attemptId: a.id, qid: q[0] ?? "" });
  await f.call("POST", `/weekly-attempts/${a.id}/submit`, s.headers);
  return { ...s, attemptId: a.id as string };
}

const queue = async (id: string) =>
  (await f.call("GET", `/admin/weekly/${id}/review`, f.teacher)).json() as ReviewQueue;
const grade = (attemptId: string, qid: string, body: object, headers = f.teacher) =>
  f.call("PUT", `/admin/weekly/attempts/${attemptId}/answers/${qid}/grade`, headers, body);

describe("Ustoz navbati (T-034)", () => {
  it("ruxsat: o'quvchiga navbat va baholash 403", async () => {
    const q = await f.questions();
    const id = await f.weekly(q);
    const s = await solve(id, q, "1/2");
    expect((await f.call("GET", `/admin/weekly/${id}/review`, s.headers)).statusCode).toBe(403);
    expect((await grade(s.attemptId, q[1] ?? "", { points: 1 }, s.headers)).statusCode).toBe(403);
  });

  it("BR-W05: shubhali va bir xil xato qilganlar navbatda birinchi; AI tavsiyasi ko'rinadi", async () => {
    const q = await f.questions();
    const id = await f.weekly(q);
    testAi.respond = (i) =>
      i.question === "1+1?" ? verdict({ verdict: "SUSPECTED_COPY", copySignals: ["SKIPPED_STEPS"] }) : null;
    const a = await solve(id, q, "1/2");
    const b = await solve(id, q, "1/2");
    const c = await solve(id, q, "3/4");
    await f.tick();
    const items = (await queue(id)).items;
    expect(items).toHaveLength(6);
    // Hamma 1-savol shubhali, a va b ning 2-savoli bir xil xato: oxirida faqat c ning 2-savoli
    expect(items.at(-1)).toMatchObject({
      attemptId: c.attemptId,
      questionId: q[1],
      signals: { sameWrong: 0 },
    });
    const bSecond = items.find((i) => i.attemptId === b.attemptId && i.questionId === q[1]);
    expect(bSecond?.signals.sameWrong).toBe(1);
    const aFirst = items.find((i) => i.attemptId === a.attemptId && i.questionId === q[0]);
    expect(aFirst).toMatchObject({
      autoPoints: 1,
      ai: { status: "DONE", suspected: true, suggested: 0 },
      decision: null,
    });
    expect(aFirst?.photos).toHaveLength(1);
  });

  it("BR-W06: ustoz bali urinish balini o'zgartiradi; o'quvchi yopilgach ball va izohni ko'radi", async () => {
    const q = await f.questions();
    const id = await f.weekly(q);
    testAi.respond = () => verdict({ studentFeedback: "Viet teoremasini toʻgʻri qoʻllading" });
    const s = await solve(id, q, "3/4");
    await f.tick();
    expect((await grade(s.attemptId, q[1] ?? "", { points: 2 })).statusCode).toBe(400);
    expect(
      (await grade(s.attemptId, q[1] ?? "", { points: 1, note: "Rasm kerak edi, lekin yechim daftarda bor" }))
        .statusCode,
    ).toBe(200);
    expect((await grade(s.attemptId, q[0] ?? "", { points: 1 })).statusCode).toBe(200);
    const waiting = (await f.call("GET", `/weekly-attempts/${s.attemptId}`, s.headers)).body;
    expect(waiting).toContain('"WAITING"');
    expect(waiting).not.toContain("Rasm kerak");

    await f.prisma.weeklyTest.update({ where: { id }, data: { closesAt: new Date(Date.now() - 1000) } });
    await f.tick();
    const r = (await f.call("GET", `/weekly-attempts/${s.attemptId}`, s.headers)).json();
    expect(r.score).toBe(2);
    expect(r.items.map((i: { result: string; feedback: string | null }) => [i.result, i.feedback])).toEqual([
      ["CORRECT", "Viet teoremasini toʻgʻri qoʻllading"],
      ["CORRECT", "Rasm kerak edi, lekin yechim daftarda bor"],
    ]);
    const decided = (await queue(id)).items.filter((i) => i.decision);
    expect(decided.map((i) => i.decision?.points)).toEqual([1, 1]);
  });

  it("BR-W03: topshirilmagan urinishga ball qo'yilmaydi (409)", async () => {
    const q = await f.questions();
    const id = await f.weekly(q);
    const s = await f.student();
    const a = (await f.call("POST", `/weekly/${id}/attempts`, s.headers)).json();
    expect((await grade(a.id, q[0] ?? "", { points: 1 })).statusCode).toBe(409);
  });
});
