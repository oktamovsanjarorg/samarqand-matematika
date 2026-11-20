import type { TutorChatView } from "@samarqand/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { testAi } from "./helpers";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(() => f.cleanup());
beforeEach(() => {
  testAi.tutorCalls.length = 0;
  testAi.reply = () => "Qaysi formulani bilasan?";
});

/** O'quvchi mavzu testini boshlaydi: nashr qilingan kurs va savollar */
async function practice() {
  const qids = await f.questions();
  const q = await f.prisma.question.findUniqueOrThrow({ where: { id: qids[0] }, include: { topic: true } });
  await f.prisma.course.update({ where: { id: q.topic.courseId }, data: { isPublished: true } });
  await f.prisma.question.updateMany({ where: { id: { in: qids } }, data: { isPublished: true } });
  const s = await f.student();
  const attempt = (await f.call("POST", `/topics/${q.topicId}/attempts`, s.headers)).json();
  return { s, qids, attemptId: attempt.id as string };
}

const start = (headers: Record<string, string>, body: object) =>
  f.call("POST", "/tutor/chats", headers, body);
const say = (headers: Record<string, string>, id: string, text: string) =>
  f.call("POST", `/tutor/chats/${id}/messages`, headers, { text });

describe("AI yordamchi (T-040)", () => {
  it("BR-T02, BR-T04: mashq rejimida kontekst serverda; urinishsiz etalon faqat yordamchiga; suhbat saqlanadi", async () => {
    const { s, qids, attemptId } = await practice();
    await f.call("PUT", `/attempts/${attemptId}/answers/${qids[1]}`, s.headers, {
      response: { value: "1/3" },
    });
    const chat = (
      await start(s.headers, { mode: "PRACTICE", attemptId, questionId: qids[1] })
    ).json() as TutorChatView;
    expect(chat).toMatchObject({ mode: "PRACTICE", messages: [], remaining: 30 });
    const again = (await start(s.headers, { mode: "PRACTICE", attemptId, questionId: qids[1] })).json();
    expect(again.id).toBe(chat.id);

    const r = await say(s.headers, chat.id, "Javobni ayt");
    expect(r.statusCode).toBe(200);
    const v = r.json() as TutorChatView;
    expect(v.messages.map((m) => [m.role, m.text])).toEqual([
      ["USER", "Javobni ayt"],
      ["ASSISTANT", "Qaysi formulani bilasan?"],
    ]);
    expect(v.remaining).toBe(29);
    // Etalon kontekstda (yordamchi tekshirishi uchun), lekin o'quvchiga qaytmaydi
    const call = testAi.tutorCalls[0];
    expect(call?.context).toContain("To'g'ri javob: 3/4");
    expect(call?.context).toContain("O'quvchi javobi: 1/3");
    expect(call?.context).toContain("Urinish: yo'q");
    expect(JSON.stringify(v)).not.toContain("3/4");

    await say(s.headers, chat.id, "Tushunmadim");
    expect(testAi.tutorCalls[1]?.history.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  });

  it("BR-T01: savol ochiq haftalik testda bo'lsa yordam yo'q; erkin savolda matni yuborilsa ham", async () => {
    const { s, qids, attemptId } = await practice();
    const chat = (await start(s.headers, { mode: "PRACTICE", attemptId, questionId: qids[0] })).json();
    await f.prisma.question.update({
      where: { id: qids[1] },
      data: { text: "Kasrlarni qo'shing: $\\frac12 + \\frac14$ = ?" },
    });
    await f.weekly(qids);
    expect((await say(s.headers, chat.id, "Yordam ber")).json()).toMatchObject({ code: "AI_BLOCKED" });
    expect((await start(s.headers, { mode: "PRACTICE", attemptId, questionId: qids[0] })).statusCode).toBe(
      403,
    );
    const free = (await start(s.headers, { mode: "FREE" })).json();
    expect(
      (
        await say(s.headers, free.id, "Mana masala: kasrlarni qoʻshing $\\frac12+\\frac14$=? yechib ber")
      ).json(),
    ).toMatchObject({
      code: "AI_BLOCKED",
    });
    expect((await say(s.headers, free.id, "Kasrlarni qanday qo'shamiz?")).statusCode).toBe(200);
    expect(testAi.tutorCalls).toHaveLength(1);
  });

  it("BR-T03: kunlik limit; AI o'chiq bo'lsa 503 va xabar saqlanmaydi", async () => {
    const { s } = await practice();
    const free = (await start(s.headers, { mode: "FREE" })).json();
    testAi.reply = () => null;
    expect((await say(s.headers, free.id, "Salom")).json()).toMatchObject({ code: "AI_UNAVAILABLE" });
    expect((await f.call("GET", `/tutor/chats/${free.id}`, s.headers)).json().messages).toEqual([]);
    testAi.reply = () => "Ha";
    const chat = await f.prisma.tutorChat.findUniqueOrThrow({ where: { id: free.id } });
    await f.prisma.tutorMessage.createMany({
      data: Array.from({ length: 30 }, () => ({ chatId: chat.id, role: "USER" as const, text: "x" })),
    });
    expect((await say(s.headers, free.id, "Yana")).json()).toMatchObject({ code: "AI_LIMIT" });
  });

  it("ruxsat: boshqa o'quvchining suhbati 404, ota-onaga 403", async () => {
    const { s } = await practice();
    const free = (await start(s.headers, { mode: "FREE" })).json();
    const other = await f.student();
    expect((await f.call("GET", `/tutor/chats/${free.id}`, other.headers)).statusCode).toBe(404);
    expect((await say(other.headers, free.id, "Salom")).statusCode).toBe(404);
    const parent = await f.student(false);
    await f.prisma.user.update({ where: { id: parent.id }, data: { role: "PARENT" } });
    expect((await start(parent.headers, { mode: "FREE" })).statusCode).toBe(403);
  });
});
