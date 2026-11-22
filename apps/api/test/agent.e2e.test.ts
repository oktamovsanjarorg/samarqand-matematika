import type { AgentReply, AgentTranscript } from "@samarqand/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { testAgent } from "./helpers";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
const courseIds: string[] = [];

beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.prisma.question.deleteMany({ where: { topic: { courseId: { in: courseIds } } } });
  await f.prisma.topic.deleteMany({ where: { courseId: { in: courseIds } } });
  await f.prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  await f.cleanup();
});
beforeEach(() => {
  testAgent.script = [];
  testAgent.calls = [];
  testAgent.fail = null;
});

/** Model javobi: bitta asbob chaqiruvi */
const use = (id: string, name: string, input: object) => ({
  content: [
    { type: "text" as const, text: "Bajaraman.", citations: null },
    { type: "tool_use" as const, id, name, input, caller: { type: "direct" as const } },
  ],
  stop_reason: "tool_use" as const,
});
const say = (text: string) => ({
  content: [{ type: "text" as const, text, citations: null }],
  stop_reason: "end_turn" as const,
});
const script = (...r: object[]) => {
  testAgent.script = r as typeof testAgent.script;
};

const chat = async (message: string, transcript: AgentTranscript = [], h = f.teacher) =>
  f.call("POST", "/admin/agent/chat", h, { transcript, message });
const confirm = (r: AgentReply, approve = true, h = f.teacher) =>
  f.call("POST", "/admin/agent/confirm", h, { transcript: r.transcript, token: r.pending?.token, approve });

/** Model ko'rgan oxirgi asbob natijasi */
const lastResult = () => {
  const msgs = testAgent.calls.at(-1)?.messages ?? [];
  const content = msgs.at(-1)?.content;
  return Array.isArray(content) ? (content[0] as { content: string; is_error?: boolean }) : null;
};

describe("Admin agenti (T-156)", () => {
  it("o'qish asbobi darhol bajariladi; natijada telefon yo'q; ro'yxatda amal ko'rinadi", async () => {
    const s = await f.student(false);
    await f.prisma.user.update({
      where: { id: s.id },
      data: { firstName: "Agentli", phone: "998901110099" },
    });
    script(use("t1", "find_students", { query: "Agentli", filter: "all" }), say("Topdim: Agentli."));
    const res = await chat("Agentli ismli o'quvchini top");
    expect(res.statusCode).toBe(200);
    const r = res.json() as AgentReply;
    expect(r.pending).toBeNull();
    expect(r.items).toEqual([
      { kind: "user", text: "Agentli ismli o'quvchini top" },
      { kind: "assistant", text: "Bajaraman." },
      { kind: "action", title: "Oʻquvchilarni qidirish: Agentli", ok: true },
      { kind: "assistant", text: "Topdim: Agentli." },
    ]);
    expect(lastResult()?.content).toContain("Agentli");
    expect(lastResult()?.content).not.toContain("998901110099");
    expect(testAgent.calls[0]?.tools.map((t) => t.name)).toContain("add_questions");
  });

  it("yozish asbobi tasdiqsiz bajarilmaydi; tasdiqlangach ustoz nomidan bajariladi va jurnalga yoziladi", async () => {
    const title = `Agent kursi ${Date.now()}`;
    script(use("t2", "create_course", { title }));
    const r = (await chat(`${title} nomli kurs och`)).json() as AgentReply;
    expect(r.pending).toMatchObject({ title: `Kurs yaratish: ${title}` });
    expect(await f.prisma.course.count({ where: { title } })).toBe(0);
    // Suhbat tasdiq kutyapti: yangi xabar yozib bo'lmaydi
    expect((await chat("yana", r.transcript)).statusCode).toBe(409);

    script(say("Kurs yaratildi."));
    const done = await confirm(r);
    expect(done.statusCode).toBe(200);
    const course = await f.prisma.course.findFirstOrThrow({ where: { title } });
    courseIds.push(course.id);
    expect((done.json() as AgentReply).items.at(-2)).toEqual({
      kind: "action",
      title: `Kurs yaratish: ${title}`,
      ok: true,
    });
    const log = await f.prisma.auditLog.findFirst({ where: { entityId: course.id } });
    expect(log?.actorId).toBeDefined();
    // Bir token ikki marta ishlamaydi (eski suhbat bilan qayta yuborilsa ham)
    expect((await confirm(r)).statusCode).toBe(403);
    expect(await f.prisma.course.count({ where: { title } })).toBe(1);
  });

  it("rad etilsa bajarilmaydi; argument o'zgartirilgan yoki boshqa xodimning tokeni 403", async () => {
    const title = `Rad kursi ${Date.now()}`;
    script(use("t3", "create_course", { title }));
    const r = (await chat("kurs och")).json() as AgentReply;

    const forged = structuredClone(r);
    const last = forged.transcript.at(-1)?.content as { type: string; input?: { title: string } }[];
    const block = last.find((b) => b.type === "tool_use");
    if (block?.input) block.input.title = "Boshqa nom";
    expect((await confirm(forged)).statusCode).toBe(403);

    const helper = await f.student(false);
    await f.prisma.user.update({ where: { id: helper.id }, data: { role: "ASSISTANT" } });
    expect((await confirm(r, true, helper.headers)).statusCode).toBe(403);

    script(say("Mayli, ochmadim."));
    const no = (await confirm(r, false)).json() as AgentReply;
    expect(no.items).toContainEqual({ kind: "action", title: `Kurs yaratish: ${title}`, ok: false });
    expect(lastResult()?.content).toContain("rad etdi");
    expect(await f.prisma.course.count({ where: { title } })).toBe(0);
  });

  it("yordamchining huquqi yo'q amali (e'lon) tasdiqqa ham chiqmaydi: 403 agentga qaytadi", async () => {
    const helper = await f.student(false);
    await f.prisma.user.update({ where: { id: helper.id }, data: { role: "ASSISTANT" } });
    script(
      use("t4", "send_broadcast", { text: "Ertaga dars yo'q", audience: "all", groupId: null }),
      say("Bu amal faqat ustozda."),
    );
    const r = (await chat("hammaga e'lon yubor", [], helper.headers)).json() as AgentReply;
    expect(r.pending).toBeNull();
    expect(lastResult()).toMatchObject({ is_error: true });
    expect(lastResult()?.content).toContain("Xato 403");
  });

  it("savollar: xatolisi agentga qaytadi, to'g'risi oldindan ko'rish bilan tasdiqqa chiqadi va qoralama bo'ladi", async () => {
    const c = (await f.call("POST", "/admin/courses", f.teacher, { title: "Agent savollari" })).json() as {
      id: string;
    };
    courseIds.push(c.id);
    const t = (
      await f.call("POST", `/admin/courses/${c.id}/topics`, f.teacher, { title: "Kasr" })
    ).json() as {
      id: string;
    };
    const bad = {
      topicId: t.id,
      questions: [{ type: "bitta", text: "$1+1$", options: ["1", "2"], answer: "C" }],
    };
    const good = {
      topicId: t.id,
      questions: [
        { type: "bitta", text: "$1+1$ = ?", options: ["1", "2"], answer: "B" },
        { type: "son", text: "$\\frac{1}{2}+\\frac{1}{4}$", answer: "3/4" },
      ],
    };
    script(use("q1", "add_questions", bad), use("q2", "add_questions", good));
    const r = (await chat("shu ikki savolni qo'sh")).json() as AgentReply;
    expect(testAgent.calls).toHaveLength(2);
    expect(JSON.stringify(testAgent.calls[1]?.messages.at(-1))).toContain("2-qator");
    expect(r.pending?.lines[0]).toBe("2 ta savol tekshiruvdan oʻtdi");

    script(say("Qo'shildi."));
    expect((await confirm(r)).statusCode).toBe(200);
    const qs = await f.prisma.question.findMany({ where: { topicId: t.id } });
    expect(qs).toHaveLength(2);
    expect(qs.every((x) => !x.isPublished)).toBe(true);
  });

  it("T-163: provayder xatosi 500 emas, sababi bilan 503; bosh sahifada ogohlantirish; tiklansa yo'qoladi", async () => {
    const advice = async () =>
      ((await f.call("GET", "/admin/advisor", f.teacher)).json() as { key: string; title: string }[]).find(
        (a) => a.key === "ai:down",
      );
    testAgent.fail = { status: 402 };
    const res = await chat("salom");
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ message: "AI hisobida mablagʻ tugagan: hisobni toʻldirish kerak" });
    expect(JSON.stringify(res.json())).not.toContain("provayder xatosi");
    expect((await advice())?.title).toContain("mablagʻ tugagan");

    testAgent.fail = null;
    expect((await chat("salom")).statusCode).toBe(200);
    expect(await advice()).toBeUndefined();
  });

  it("ruxsatlar: o'quvchiga 403, tokensiz 401; holat yoqilgan; bo'sh xabar 400", async () => {
    expect((await f.call("GET", "/admin/agent", f.teacher)).json()).toEqual({ enabled: true });
    const s = await f.student();
    expect((await chat("salom", [], s.headers)).statusCode).toBe(403);
    expect((await f.call("GET", "/admin/agent", {})).statusCode).toBe(401);
    expect((await chat("   ")).statusCode).toBe(400);
  });
});
