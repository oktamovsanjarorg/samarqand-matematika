import type { AdminQuestionHit } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.cleanup();
});

const search = (q: string, headers: Record<string, string> = f.teacher) =>
  f.call("GET", `/admin/questions?q=${encodeURIComponent(q)}`, headers);

describe("Savollar bankida qidiruv (T-096)", () => {
  it("matn (katta-kichik harfsiz) va teg bo'yicha; mavzu nomi bilan; javob qaytarilmaydi", async () => {
    const [a, b] = await f.questions();
    const word = `Zqxsearch${Date.now()}`;
    const tag = `zq-${Date.now()}`;
    await f.prisma.question.update({ where: { id: a ?? "" }, data: { text: `Tenglama ${word} ni yeching` } });
    await f.prisma.question.update({ where: { id: b ?? "" }, data: { skills: [tag] } });

    const byText = await search(word.toLowerCase());
    expect(byText.statusCode).toBe(200);
    const hits = byText.json() as AdminQuestionHit[];
    expect(hits.map((h) => h.id)).toEqual([a]);
    expect(hits[0]?.topicTitle).toMatch(/ · Aralash$/);
    expect(hits[0]).not.toHaveProperty("answer");
    expect(hits[0]).not.toHaveProperty("solution");

    expect(((await search(tag)).json() as AdminQuestionHit[]).map((h) => h.id)).toEqual([b]);
  });

  it("juda qisqa so'rov 400; o'quvchiga 403, tokensiz 401", async () => {
    expect((await search(" x ")).statusCode).toBe(400);
    const s = await f.student();
    expect((await search("tenglama", s.headers)).statusCode).toBe(403);
    expect((await search("tenglama", {})).statusCode).toBe(401);
  });
});
