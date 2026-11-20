import type { Ranking } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(() => f.cleanup());

/** O'quvchi: `right` ta savolga to'g'ri javob + rasm, topshiradi; submit=false bo'lsa faqat boshlaydi */
async function play(testId: string, q: string[], p: { name: string; right: number; submit?: boolean }) {
  const { name, right, submit = true } = p;
  const s = await f.student();
  await f.prisma.studentProfile.update({ where: { userId: s.id }, data: { fullName: name } });
  const a = (await f.call("POST", `/weekly/${testId}/attempts`, s.headers)).json();
  const answers = [{ optionId: "b" }, { value: "3/4" }];
  for (let i = 0; i < right; i++) {
    await f.call("PUT", `/weekly-attempts/${a.id}/answers/${q[i]}`, s.headers, { response: answers[i] });
    await f.photo(s.headers, { attemptId: a.id, qid: q[i] ?? "" });
  }
  if (submit) await f.call("POST", `/weekly-attempts/${a.id}/submit`, s.headers);
  return s;
}

const closeTest = (id: string) =>
  f.prisma.weeklyTest.update({ where: { id }, data: { closesAt: new Date(Date.now() - 1000) } });
const ranking = async (path: string, headers: Record<string, string>) =>
  (await f.call("GET", path, headers)).json() as Ranking;

describe("Reyting (T-035)", () => {
  it("BR-W08, BR-W10: oyna ochiq — 403; yopilgach teng ballga teng o'rin, boshqalar ismi qisqa", async () => {
    const q = await f.questions();
    const id = await f.weekly(q);
    const a = await play(id, q, { name: "Aliyev Botir", right: 2 });
    const b = await play(id, q, { name: "Karimov Jasur", right: 1 });
    await play(id, q, { name: "Nazarov Sardor", right: 1 });
    await play(id, q, { name: "Olimov Umid", right: 2, submit: false });
    expect((await f.call("GET", `/weekly/${id}/ranking`, b.headers)).statusCode).toBe(403);

    await closeTest(id);
    await f.tick();
    const r = await ranking(`/weekly/${id}/ranking`, b.headers);
    expect(r.participants).toBe(4);
    expect(r.top.map((x) => [x.place, x.name, x.score])).toEqual([
      [1, "Aliyev B.", 2],
      [2, "Karimov Jasur", 1],
      [2, "Nazarov S.", 1],
      [4, "Olimov U.", 0],
    ]);
    expect(r.me).toMatchObject({ place: 2, me: true, score: 1 });
    expect(JSON.stringify(r)).not.toContain("Botir");
    expect((await ranking(`/weekly/${id}/ranking`, a.headers)).me?.place).toBe(1);
  });

  it("BR-W10: umumiy reyting yopilgan testlar ballari yig'indisi; ochiq test hisobga kirmaydi", async () => {
    const q = await f.questions();
    const first = await f.weekly(q);
    const s = await play(first, q, { name: "Yigindi Test", right: 2 });
    await closeTest(first);
    const second = await f.weekly(q);
    const a = (await f.call("POST", `/weekly/${second}/attempts`, s.headers)).json();
    await f.call("PUT", `/weekly-attempts/${a.id}/answers/${q[0]}`, s.headers, {
      response: { optionId: "b" },
    });
    await f.photo(s.headers, { attemptId: a.id, qid: q[0] ?? "" });
    await f.call("POST", `/weekly-attempts/${a.id}/submit`, s.headers);
    expect((await ranking("/weekly-ranking", s.headers)).me?.score).toBe(2);
    await closeTest(second);
    await f.tick();
    const r = await ranking("/weekly-ranking", s.headers);
    expect(r.me).toMatchObject({ score: 3, name: "Yigindi Test" });
    expect(r.top.length).toBeLessThanOrEqual(10);
  });

  it("ruxsat: ota-onaga reyting yopiq (403)", async () => {
    const parent = await f.student(false);
    await f.prisma.user.update({ where: { id: parent.id }, data: { role: "PARENT" } });
    await f.prisma.studentProfile.deleteMany({ where: { userId: parent.id } });
    expect((await f.call("GET", "/weekly-ranking", parent.headers)).statusCode).toBe(403);
  });
});
