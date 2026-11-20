import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sentMessages } from "./helpers";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(() => f.cleanup());

describe("Haftalik test", () => {
  it("ruxsat: o'quvchi admin API'ga 403, tokensiz 401; noto'g'ri oyna va noma'lum savol 400", async () => {
    const s = await f.student();
    const qids = await f.questions();
    expect((await f.call("GET", "/admin/weekly", s.headers)).statusCode).toBe(403);
    expect((await f.call("GET", "/weekly", {})).statusCode).toBe(401);
    const bad = { title: "X", opensAt: f.at(f.HOUR), closesAt: f.at(0), questionIds: qids };
    expect((await f.call("POST", "/admin/weekly", f.teacher, bad)).statusCode).toBe(400);
    expect(
      (
        await f.call("POST", "/admin/weekly", f.teacher, {
          ...bad,
          closesAt: f.at(2 * f.HOUR),
          questionIds: ["yoq"],
        })
      ).statusCode,
    ).toBe(400);
  });

  it("BR-W01: oyna ochilmagan bo'lsa 409; to'liq kirishsiz 403 LOCKED", async () => {
    const qids = await f.questions();
    const upcoming = await f.weekly(qids, f.HOUR, 48 * f.HOUR);
    const s = await f.student();
    expect((await f.call("POST", `/weekly/${upcoming}/attempts`, s.headers)).json().message).toBe(
      "Test hali ochilmagan",
    );
    const open = await f.weekly(qids);
    const locked = await f.call("POST", `/weekly/${open}/attempts`, (await f.student(false)).headers);
    expect(locked.statusCode).toBe(403);
    expect(locked.json().code).toBe("LOCKED");
  });

  it("BR-W02, BR-W08: bitta urinish; topshirgach javob ham natija ham oyna yopilguncha yo'q", async () => {
    const qids = await f.questions();
    const id = await f.weekly(qids);
    const s = await f.student();
    const view = (await f.call("POST", `/weekly/${id}/attempts`, s.headers)).json();
    expect(view.status).toBe("OPEN");
    expect(JSON.stringify(view)).not.toContain('"answer"');
    expect((await f.call("POST", `/weekly/${id}/attempts`, s.headers)).json().id).toBe(view.id);
    await f.call("PUT", `/weekly-attempts/${view.id}/answers/${qids[0]}`, s.headers, {
      response: { optionId: "b" },
    });
    const sub = (await f.call("POST", `/weekly-attempts/${view.id}/submit`, s.headers)).json();
    expect(sub).toMatchObject({ status: "WAITING" });
    expect(JSON.stringify(sub)).not.toContain("correct");
    expect((await f.call("POST", `/weekly-attempts/${view.id}/submit`, s.headers)).statusCode).toBe(409);
    const row = (await f.call("GET", "/weekly", s.headers)).json().find((r: { id: string }) => r.id === id);
    expect(row.my).toEqual({ started: true, submitted: true, score: null });
  });

  it("BR-W03: yopilganda topshirgan ball oladi, topshirmagan 0; natija xabari; yopilgandan keyin javob 409", async () => {
    const qids = await f.questions();
    const id = await f.weekly(qids);
    const done = await f.student();
    const late = await f.student();
    const a = (await f.call("POST", `/weekly/${id}/attempts`, done.headers)).json();
    await f.call("PUT", `/weekly-attempts/${a.id}/answers/${qids[0]}`, done.headers, {
      response: { optionId: "b" },
    });
    expect((await f.photo(done.headers, { attemptId: a.id, qid: qids[0] ?? "" })).statusCode).toBe(201);
    await f.call("POST", `/weekly-attempts/${a.id}/submit`, done.headers);
    const b = (await f.call("POST", `/weekly/${id}/attempts`, late.headers)).json();
    await f.call("PUT", `/weekly-attempts/${b.id}/answers/${qids[0]}`, late.headers, {
      response: { optionId: "b" },
    });

    await f.prisma.weeklyTest.update({ where: { id }, data: { closesAt: new Date(Date.now() - 1000) } });
    await f.tick();
    const r1 = (await f.call("GET", `/weekly-attempts/${a.id}`, done.headers)).json();
    expect(r1).toMatchObject({ status: "RESULT", score: 1, total: 2 });
    expect(r1.items[1].answer).toEqual({ value: "3/4" });
    const r2 = (await f.call("GET", `/weekly-attempts/${b.id}`, late.headers)).json();
    expect(r2).toMatchObject({ status: "RESULT", score: 0, submittedAt: null });
    expect(r2.items[0].result).toBe("WRONG");
    expect(f.messagesTo(done.telegramId).at(-1)).toContain("natijasi: <b>1/2</b>");
    expect(f.messagesTo(late.telegramId).at(-1)).toContain("<b>0/2</b>");
    expect(
      (
        await f.call("PUT", `/weekly-attempts/${b.id}/answers/${qids[1]}`, late.headers, {
          response: { value: "3/4" },
        })
      ).statusCode,
    ).toBe(409);

    const table = (await f.call("GET", `/admin/weekly/${id}/standings`, f.teacher)).json();
    expect(table.map((x: { userId: string; score: number }) => [x.userId, x.score])).toEqual([
      [done.id, 1],
      [late.id, 0],
    ]);
    const before = sentMessages.length;
    await f.tick();
    expect(sentMessages.length).toBe(before);
  });

  it("BR-W07: 24 va 3 soat qolganda topshirmaganlarga bir martadan eslatma", async () => {
    const qids = await f.questions();
    const id = await f.weekly(qids, -f.HOUR, 20 * f.HOUR);
    const s = await f.student();
    await f.tick();
    expect(f.messagesTo(s.telegramId).filter((m) => m.includes("24 soat qoldi"))).toHaveLength(1);
    await f.tick();
    expect(f.messagesTo(s.telegramId).filter((m) => m.includes("soat qoldi"))).toHaveLength(1);
    await f.prisma.weeklyTest.update({
      where: { id },
      data: { closesAt: new Date(Date.now() + 2 * f.HOUR) },
    });
    await f.tick();
    expect(f.messagesTo(s.telegramId).filter((m) => m.includes("3 soat qoldi"))).toHaveLength(1);
  });

  it("boshlangan testning savollari o'zgarmaydi, o'chirilmaydi (409)", async () => {
    const qids = await f.questions();
    const id = await f.weekly(qids);
    const s = await f.student();
    await f.call("POST", `/weekly/${id}/attempts`, s.headers);
    const body = {
      title: "Yangi nom",
      opensAt: f.at(-f.HOUR),
      closesAt: f.at(48 * f.HOUR),
      isPublished: true,
    };
    expect(
      (await f.call("PUT", `/admin/weekly/${id}`, f.teacher, { ...body, questionIds: [qids[0]] })).statusCode,
    ).toBe(409);
    expect(
      (await f.call("PUT", `/admin/weekly/${id}`, f.teacher, { ...body, questionIds: qids })).statusCode,
    ).toBe(200);
    expect((await f.call("DELETE", `/admin/weekly/${id}`, f.teacher)).statusCode).toBe(409);
    expect((await f.call("GET", `/admin/weekly/${id}`, f.teacher)).json()).toMatchObject({
      title: "Yangi nom",
      questionIds: qids,
      status: "OPEN",
    });
  });

  it("BR-W04: yechim rasmi 1–3 ta, faqat ochiq urinishga; rasmsiz to'g'ri javob 0", async () => {
    const qids = await f.questions();
    const [q0 = "", q1 = ""] = qids;
    const id = await f.weekly(qids);
    const s = await f.student();
    const other = await f.student();
    const a = (await f.call("POST", `/weekly/${id}/attempts`, s.headers)).json();
    expect(
      (
        await f.photo(s.headers, {
          attemptId: a.id,
          qid: q0,
          body: Buffer.from("rasm emas, matn"),
          type: "image/jpeg",
        })
      ).statusCode,
    ).toBe(400);
    expect((await f.photo(other.headers, { attemptId: a.id, qid: q0 })).statusCode).toBe(404);
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) ids.push((await f.photo(s.headers, { attemptId: a.id, qid: q0 })).json().id);
    expect((await f.photo(s.headers, { attemptId: a.id, qid: q0 })).statusCode).toBe(409);
    expect((await f.call("DELETE", `/weekly-attempts/${a.id}/photos/${ids[2]}`, s.headers)).statusCode).toBe(
      204,
    );
    const view = (await f.call("GET", `/weekly-attempts/${a.id}`, s.headers)).json();
    expect(view.questions[0].photos).toEqual(ids.slice(0, 2));
    expect(view.questions[1].photos).toEqual([]);

    const own = await f.call("GET", `/weekly-photos/${ids[0]}`, s.headers);
    expect(own.headers["content-type"]).toBe("image/png");
    expect((await f.call("GET", `/weekly-photos/${ids[0]}`, other.headers)).statusCode).toBe(404);
    expect((await f.call("GET", `/admin/weekly/photos/${ids[0]}`, s.headers)).statusCode).toBe(403);
    expect((await f.call("GET", `/admin/weekly/photos/${ids[0]}`, f.teacher)).statusCode).toBe(200);

    // Ikkala javob to'g'ri, lekin 2-savolga rasm yo'q: ball 1
    await f.call("PUT", `/weekly-attempts/${a.id}/answers/${q0}`, s.headers, { response: { optionId: "b" } });
    await f.call("PUT", `/weekly-attempts/${a.id}/answers/${q1}`, s.headers, { response: { value: "0,75" } });
    await f.call("POST", `/weekly-attempts/${a.id}/submit`, s.headers);
    expect((await f.photo(s.headers, { attemptId: a.id, qid: q1 })).statusCode).toBe(409);
    expect((await f.call("DELETE", `/weekly-attempts/${a.id}/photos/${ids[0]}`, s.headers)).statusCode).toBe(
      409,
    );
    await f.prisma.weeklyTest.update({ where: { id }, data: { closesAt: new Date(Date.now() - 1000) } });
    const r = (await f.call("GET", `/weekly-attempts/${a.id}`, s.headers)).json();
    expect(r.score).toBe(1);
    expect(r.items.map((i: { result: string; noPhoto: boolean }) => [i.result, i.noPhoto])).toEqual([
      ["CORRECT", false],
      ["CORRECT", true],
    ]);
  });
});
