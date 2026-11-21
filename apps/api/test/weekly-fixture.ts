import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { PrismaClient } from "@samarqand/db";
import { expect } from "vitest";
import { WeeklyScheduler } from "../src/weekly/weekly-scheduler";
import { createApp, loginAs, sentMessages } from "./helpers";

/** Haftalik test sinovlari uchun umumiy muhit: ilova, ustoz, savollar, test, o'quvchi va tozalash */
export async function weeklyFixture() {
  const prisma = new PrismaClient();
  const app: NestFastifyApplication = await createApp();
  const t = await loginAs(app, { owner: true });
  const teacher = t.headers;
  const tgIds: bigint[] = [t.telegramId];
  const courseIds: string[] = [];
  const HOUR = 3_600_000;

  type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  const call = (method: Method, url: string, headers: Record<string, string>, payload?: object) =>
    app.inject({ method, url: `/api${url}`, headers, ...(payload ? { payload } : {}) });
  const at = (ms: number) => new Date(Date.now() + ms).toISOString();
  const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(32)]);
  const photo = (
    headers: Record<string, string>,
    p: { attemptId: string; qid: string; body?: Buffer; type?: string },
  ) =>
    app.inject({
      method: "POST",
      url: `/api/weekly-attempts/${p.attemptId}/answers/${p.qid}/photos`,
      headers: { ...headers, "content-type": p.type ?? "image/png" },
      payload: p.body ?? PNG,
    });

  async function questions() {
    const c = (await call("POST", "/admin/courses", teacher, { title: "Haftalik kurs" })).json();
    courseIds.push(c.id);
    const t = (await call("POST", `/admin/courses/${c.id}/topics`, teacher, { title: "Aralash" })).json();
    const add = async (q: object) =>
      (await call("POST", `/admin/topics/${t.id}/questions`, teacher, q)).json().id as string;
    return [
      await add({
        type: "SINGLE",
        text: "1+1?",
        options: [
          { id: "a", text: "1" },
          { id: "b", text: "2" },
        ],
        answer: { optionId: "b" },
      }),
      await add({ type: "NUMERIC", text: "1/2+1/4?", answer: { value: "3/4" } }),
    ];
  }

  async function weekly(qids: string[], opens = -HOUR, closes = 48 * HOUR) {
    const res = await call("POST", "/admin/weekly", teacher, {
      title: "1-hafta",
      opensAt: at(opens),
      closesAt: at(closes),
      questionIds: qids,
      isPublished: true,
    });
    expect(res.statusCode).toBe(201);
    return res.json().id as string;
  }

  async function student(free = true) {
    const s = await loginAs(app);
    tgIds.push(s.telegramId);
    const u = await prisma.user.findUniqueOrThrow({
      where: { telegramId: s.telegramId },
      select: { id: true },
    });
    if (free)
      await prisma.studentProfile.upsert({
        where: { userId: u.id },
        update: { accessMode: "FREE" },
        create: { userId: u.id, accessMode: "FREE" },
      });
    return { ...s, id: u.id, telegramId: s.telegramId };
  }

  const tick = (now = new Date()) => app.get(WeeklyScheduler).tick(now);
  const messagesTo = (tg: bigint) => sentMessages.filter((m) => m.chatId === tg).map((m) => m.html);
  /** Xabar tugmalari (T-093) */
  const buttonsTo = (tg: bigint) => sentMessages.filter((m) => m.chatId === tg).map((m) => m.button);

  const cleanup = async () => {
    const users = await prisma.user.findMany({ where: { telegramId: { in: tgIds } }, select: { id: true } });
    const userIds = users.map((u) => u.id);
    await prisma.weeklyTest.deleteMany({
      where: { questions: { some: { question: { topic: { courseId: { in: courseIds } } } } } },
    });
    await prisma.mockTest.deleteMany({
      where: { questions: { some: { question: { topic: { courseId: { in: courseIds } } } } } },
    });
    // Mavzu testlari mavzu va savolni o'chirishga yo'l qo'ymaydi (Restrict)
    await prisma.topicAttempt.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.question.deleteMany({ where: { topic: { courseId: { in: courseIds } } } });
    await prisma.topic.deleteMany({ where: { courseId: { in: courseIds } } });
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
    // T-099: testda o'chirilgan kontent axlat qutisida qolmasin
    await prisma.trashItem.deleteMany({ where: { deletedById: { in: userIds } } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { telegramId: { in: tgIds } } });
    await prisma.$disconnect();
    await app.close();
  };

  return {
    prisma,
    app,
    teacher,
    teacherTg: t.telegramId,
    HOUR,
    call,
    at,
    photo,
    questions,
    weekly,
    student,
    tick,
    messagesTo,
    buttonsTo,
    cleanup,
  };
}
