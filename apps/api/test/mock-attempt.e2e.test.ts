import type { MockOpen, MockResult, StudentMockRow } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MockScheduler } from "../src/mock/mock-scheduler";
import { testAi } from "./helpers";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
let templateId: string;
const MIN = 60_000;

beforeAll(async () => {
  f = await weeklyFixture();
  const template = {
    name: "Urinish shabloni",
    durationMin: 30,
    scaleMax: 75,
    sections: [
      { title: "Yopiq", types: ["SINGLE"], count: 1, points: 1.5 },
      { title: "Ochiq", types: ["NUMERIC"], count: 1, points: 3 },
    ],
    grades: [{ label: "C", min: 20 }],
  };
  templateId = (await f.call("POST", "/admin/exam-templates", f.teacher, template)).json().id;
});
afterAll(async () => {
  await f.prisma.mockTest.deleteMany({ where: { templateId } });
  await f.prisma.examTemplate.deleteMany({ where: { id: templateId } });
  await f.cleanup();
});

/** Yangi mock: 1-bo'lim SINGLE (to'g'ri "b"), 2-bo'lim NUMERIC (3/4) */
async function mock(closesIn = 48 * f.HOUR, opensIn = -f.HOUR) {
  const [single = "", numeric = ""] = await f.questions();
  const res = await f.call("POST", "/admin/mocks", f.teacher, {
    title: "Sinov mock",
    templateId,
    opensAt: f.at(opensIn),
    closesAt: f.at(closesIn),
    sections: [[single], [numeric]],
    isPublished: true,
  });
  expect(res.statusCode).toBe(201);
  return { id: res.json().id as string, single, numeric };
}
const begin = async (headers: Record<string, string>, id: string) =>
  f.call("POST", `/mocks/${id}/attempts`, headers);

describe("Mock urinishi (T-051b)", () => {
  it("muddat server bo'yicha; to'g'ri javob yuborilmaydi; topshirilgach kutish, keyin javob qabul qilinmaydi", async () => {
    const m = await mock();
    const s = await f.student();
    const before = Date.now();
    const a = (await begin(s.headers, m.id)).json() as MockOpen;
    expect(a.status).toBe("OPEN");
    expect(new Date(a.deadline).getTime() - before).toBeGreaterThanOrEqual(30 * MIN - 2000);
    expect(new Date(a.deadline).getTime() - before).toBeLessThanOrEqual(30 * MIN + 2000);
    expect(a.sections).toEqual([
      { title: "Yopiq", count: 1, points: 1.5 },
      { title: "Ochiq", count: 1, points: 3 },
    ]);
    expect(JSON.stringify(a)).not.toMatch(/"answer"|"solution"|3\/4/);
    expect((await begin(s.headers, m.id)).json().id).toBe(a.id);

    const put = (qid: string, response: object) =>
      f.call("PUT", `/mock-attempts/${a.id}/answers/${qid}`, s.headers, { response });
    expect((await put(m.single, { optionId: "b" })).statusCode).toBe(204);
    expect((await put(m.numeric, { optionId: "b" })).statusCode).toBe(400);
    const other = await f.student();
    expect((await f.call("GET", `/mock-attempts/${a.id}`, other.headers)).statusCode).toBe(404);

    expect((await f.call("POST", `/mock-attempts/${a.id}/submit`, s.headers)).json().status).toBe("WAITING");
    expect((await put(m.single, { optionId: "a" })).statusCode).toBe(409);
    // Boshlangan mockning savollari o'zgarmaydi
    const [q2 = ""] = await f.questions();
    const edit = await f.call("PUT", `/admin/mocks/${m.id}`, f.teacher, {
      title: "Sinov mock",
      templateId,
      opensAt: f.at(-f.HOUR),
      closesAt: f.at(48 * f.HOUR),
      sections: [[q2], [m.numeric]],
    });
    expect(edit.statusCode).toBe(409);
  });

  it("BR-M05: vaqt tugasa saqlangan javoblar bilan topshiriladi; natija yopilgach bo'limlar bo'yicha, taxminiy", async () => {
    const m = await mock(10 * MIN);
    const s = await f.student();
    const a = (await begin(s.headers, m.id)).json() as MockOpen;
    // Oyna 10 daqiqada yopiladi: muddat oyna yopilishidan oshmaydi
    expect(new Date(a.deadline).getTime()).toBeLessThanOrEqual(Date.now() + 10 * MIN + 1000);
    await f.call("PUT", `/mock-attempts/${a.id}/answers/${m.single}`, s.headers, {
      response: { optionId: "b" },
    });
    await f.call("PUT", `/mock-attempts/${a.id}/answers/${m.numeric}`, s.headers, {
      response: { value: "0,7" },
    });
    const deadline = new Date(Date.now() - MIN);
    await f.prisma.mockAttempt.update({ where: { id: a.id }, data: { deadline } });
    const waiting = (await f.call("GET", `/mock-attempts/${a.id}`, s.headers)).json();
    expect(waiting).toMatchObject({ status: "WAITING", submittedAt: deadline.toISOString() });

    await f.prisma.mockTest.update({ where: { id: m.id }, data: { closesAt: new Date(Date.now() - 1000) } });
    const r = (await f.call("GET", `/mock-attempts/${a.id}`, s.headers)).json() as MockResult;
    expect(r).toMatchObject({
      status: "RESULT",
      raw: 1.5,
      maxRaw: 4.5,
      scaled: 25,
      scaleMax: 75,
      grade: "C",
      approx: true,
    });
    expect(r.sections).toEqual([
      { title: "Yopiq", correct: 1, total: 1, raw: 1.5, maxRaw: 1.5 },
      { title: "Ochiq", correct: 0, total: 1, raw: 0, maxRaw: 3 },
    ]);
    expect(r.items.map((i) => [i.section, i.result, i.points])).toEqual([
      [0, "CORRECT", 1.5],
      [1, "WRONG", 0],
    ]);
    const row = ((await f.call("GET", "/mocks", s.headers)).json() as StudentMockRow[]).find(
      (x) => x.id === m.id,
    );
    expect(row?.my).toEqual({ started: true, submitted: true, scaled: 25, grade: "C" });
  });

  it("kirishsiz o'quvchiga 403, ochilmagan mock 409, boshlamaganga yopilgach 0", async () => {
    const m = await mock(2 * f.HOUR, f.HOUR);
    const locked = await f.student(false);
    const open = await mock();
    expect((await begin(locked.headers, open.id)).json()).toMatchObject({ code: "LOCKED" });
    const s = await f.student();
    expect((await begin(s.headers, m.id)).statusCode).toBe(409);
    await f.prisma.mockTest.update({
      where: { id: open.id },
      data: { closesAt: new Date(Date.now() - 1000) },
    });
    const row = ((await f.call("GET", "/mocks", s.headers)).json() as StudentMockRow[]).find(
      (x) => x.id === open.id,
    );
    expect(row).toMatchObject({ status: "CLOSED", my: { started: false, scaled: 0, grade: null } });
  });

  it("BR-T01: mock yechilayotganda yordamchi o'chiq", async () => {
    testAi.reply = () => "Javob";
    const m = await mock();
    const s = await f.student();
    const chat = (await f.call("POST", "/tutor/chats", s.headers, { mode: "FREE" })).json();
    expect(
      (await f.call("POST", `/tutor/chats/${chat.id}/messages`, s.headers, { text: "Salom" })).statusCode,
    ).toBe(200);
    const a = (await begin(s.headers, m.id)).json() as MockOpen;
    const blocked = await f.call("POST", `/tutor/chats/${chat.id}/messages`, s.headers, { text: "Salom" });
    expect(blocked.json()).toMatchObject({ code: "AI_BLOCKED" });
    await f.call("POST", `/mock-attempts/${a.id}/submit`, s.headers);
    expect(
      (await f.call("POST", `/tutor/chats/${chat.id}/messages`, s.headers, { text: "Salom" })).statusCode,
    ).toBe(200);
  });

  it("T-053: oyna yopilganda vaqti o'tgan urinish topshiriladi, ball qo'yiladi va o'quvchiga xabar boradi", async () => {
    const m = await mock();
    const s = await f.student();
    const a = (await begin(s.headers, m.id)).json() as MockOpen;
    await f.call("PUT", `/mock-attempts/${a.id}/answers/${m.numeric}`, s.headers, {
      response: { value: "0.75" },
    });
    const closesAt = new Date(Date.now() - 1000);
    await f.prisma.mockTest.update({ where: { id: m.id }, data: { closesAt } });
    await f.prisma.mockAttempt.update({ where: { id: a.id }, data: { deadline: closesAt } });
    await f.app.get(MockScheduler).close(new Date());
    await f.app.get(MockScheduler).close(new Date());

    const saved = await f.prisma.mockAttempt.findUniqueOrThrow({ where: { id: a.id } });
    expect(saved).toMatchObject({ raw: 3, scaled: 50 });
    expect(saved.submittedAt?.toISOString()).toBe(closesAt.toISOString());
    expect((await f.prisma.mockTest.findUniqueOrThrow({ where: { id: m.id } })).raschN).toBeNull();
    const r = (await f.call("GET", `/mock-attempts/${a.id}`, s.headers)).json() as MockResult;
    expect(r).toMatchObject({ scaled: 50, grade: "C", approx: true });
    const sent = f.messagesTo(s.telegramId).filter((t) => t.includes("Sinov mock"));
    expect(sent).toEqual([expect.stringContaining("<b>50/75</b>, daraja <b>C</b>")]);
  });
});
