import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { PrismaClient } from "@samarqand/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp, loginAs, sentMessages } from "./helpers";
import type { IncomeMonth } from "@samarqand/shared";

const prisma = new PrismaClient();
let app: NestFastifyApplication;
let teacher: Record<string, string>;
let assistant: Record<string, string>;
const tgIds: bigint[] = [];
const planIds: string[] = [];

// Eng kichik haqiqiy PNG sarlavhasi (sniffImage uchun yetarli)
const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(32)]);

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
const call = (method: Method, url: string, headers: Record<string, string>, payload?: object) =>
  app.inject({ method, url: `/api${url}`, headers, ...(payload ? { payload } : {}) });
const upload = (headers: Record<string, string>, planId: string, body: Buffer, type = "image/png") =>
  app.inject({
    method: "POST",
    url: `/api/billing/payments?planId=${planId}&note=Otamning%20kartasidan`,
    headers: { ...headers, "content-type": type },
    payload: body,
  });

async function student() {
  const s = await loginAs(app);
  tgIds.push(s.telegramId);
  const u = await prisma.user.findUniqueOrThrow({
    where: { telegramId: s.telegramId },
    select: { id: true },
  });
  return { ...s, id: u.id };
}

async function plan(durationDays = 30) {
  const p = (
    await call("POST", "/admin/plans", teacher, { name: "Oylik", priceUzs: 150_000, durationDays })
  ).json();
  planIds.push(p.id);
  return p.id as string;
}

beforeAll(async () => {
  app = await createApp();
  const t = await loginAs(app, { owner: true });
  const a = await loginAs(app);
  await prisma.user.update({ where: { telegramId: a.telegramId }, data: { role: "ASSISTANT" } });
  teacher = t.headers;
  assistant = a.headers;
  tgIds.push(t.telegramId, a.telegramId);
});

afterAll(async () => {
  const users = await prisma.user.findMany({ where: { telegramId: { in: tgIds } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.payment.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.plan.deleteMany({ where: { id: { in: planIds } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { telegramId: { in: tgIds } } });
  await prisma.$disconnect();
  await app.close();
});

describe("To'lov va obuna", () => {
  it("BR-B05: tarif va karta faqat ustozda; o'quvchi admin cheklarini ko'rmaydi", async () => {
    const s = await student();
    expect(
      (await call("POST", "/admin/plans", assistant, { name: "X", priceUzs: 10_000, durationDays: 30 }))
        .statusCode,
    ).toBe(403);
    expect(
      (await call("PUT", "/admin/billing-card", assistant, { number: "8600 0000 0000 0000", holder: "A" }))
        .statusCode,
    ).toBe(403);
    expect((await call("GET", "/admin/payments", s.headers)).statusCode).toBe(403);
    expect((await call("GET", "/admin/payments", assistant)).statusCode).toBe(200);
    expect((await call("GET", "/billing", teacher)).statusCode).toBe(403);
    expect((await call("GET", "/billing", {})).statusCode).toBe(401);
  });

  it("karta: 16 raqam, bo'sh joylar olib tashlanadi, auditga faqat oxirgi 4 ta", async () => {
    expect(
      (await call("PUT", "/admin/billing-card", teacher, { number: "1234", holder: "Ustoz" })).statusCode,
    ).toBe(400);
    const res = await call("PUT", "/admin/billing-card", teacher, {
      number: "8600 1234 5678 9012",
      holder: "Karta Egasi",
    });
    expect(res.json()).toEqual({ number: "8600123456789012", holder: "Karta Egasi" });
    const log = await prisma.auditLog.findFirst({
      where: { action: "billing.card" },
      orderBy: { createdAt: "desc" },
    });
    expect(JSON.stringify(log?.data)).not.toContain("86001234");
  });

  it("BR-B01, BR-B02: chek faqat rasm, bitta kutilayotgan chek; o'quvchi bekor qila oladi", async () => {
    const s = await student();
    const planId = await plan();
    expect((await upload(s.headers, planId, Buffer.from("not an image at all"))).statusCode).toBe(400);
    expect((await upload(s.headers, "yoq", PNG)).statusCode).toBe(404);
    const first = await upload(s.headers, planId, PNG);
    expect(first.statusCode).toBe(201);
    expect(first.json()).toMatchObject({ status: "PENDING", amountUzs: 150_000, planName: "Oylik" });
    expect(sentMessages.at(-1)?.html).toContain("Yangi toʻlov cheki");
    expect((await upload(s.headers, planId, PNG)).statusCode).toBe(409);

    const view = (await call("GET", "/billing", s.headers)).json();
    expect(view.payments).toHaveLength(1);
    expect(view.subscription).toBeNull();
    expect((await call("DELETE", `/billing/payments/${first.json().id}`, s.headers)).statusCode).toBe(204);
    expect((await call("GET", "/billing", s.headers)).json().payments).toHaveLength(0);
  });

  it("BR-B03, BR-A04: tasdiq obunani ochadi va uzaytiradi; ikkinchi tasdiq 409", async () => {
    const s = await student();
    const planId = await plan(30);
    const p1 = (await upload(s.headers, planId, PNG)).json();
    const receipt = await call("GET", `/admin/payments/${p1.id}/receipt`, assistant);
    expect(receipt.headers["content-type"]).toBe("image/png");
    const ok = await call("POST", `/admin/payments/${p1.id}/approve`, assistant);
    expect(ok.statusCode).toBe(200);
    expect(ok.json().status).toBe("APPROVED");
    expect(sentMessages.at(-1)?.html).toContain("Toʻlovingiz tasdiqlandi");
    expect((await call("POST", `/admin/payments/${p1.id}/approve`, teacher)).statusCode).toBe(409);
    expect((await call("GET", "/me/profile", s.headers)).json().access.paid).toBe(true);

    const first = new Date((await call("GET", "/billing", s.headers)).json().subscription.endsAt).getTime();
    const p2 = (await upload(s.headers, planId, PNG)).json();
    // T-128: ustoz tasdiqdan oldin yangi tugash sanasini ko'radi; tasdiq aynan shu sanani beradi
    const pending = (await call("GET", "/admin/payments?status=PENDING", teacher)).json() as {
      id: string;
      extendsTo: string | null;
    }[];
    const preview = new Date(pending.find((x) => x.id === p2.id)?.extendsTo ?? 0).getTime();
    const done = (await call("POST", `/admin/payments/${p2.id}/approve`, teacher)).json();
    expect(done.extendsTo).toBeNull();
    const second = new Date((await call("GET", "/billing", s.headers)).json().subscription.endsAt).getTime();
    expect(Math.round((second - first) / 86_400_000)).toBe(30);
    expect(preview).toBe(second);
  });

  it("BR-B04: rad etish sabab talab qiladi, o'quvchiga sabab boradi", async () => {
    const s = await student();
    const p = (await upload(s.headers, await plan(), PNG)).json();
    expect((await call("POST", `/admin/payments/${p.id}/reject`, teacher, { reason: "" })).statusCode).toBe(
      400,
    );
    const res = await call("POST", `/admin/payments/${p.id}/reject`, teacher, {
      reason: "Summa toʻliq emas",
    });
    expect(res.json()).toMatchObject({ status: "REJECTED", reviewNote: "Summa toʻliq emas" });
    expect(sentMessages.at(-1)?.html).toContain("Summa toʻliq emas");
    expect((await call("GET", "/me/profile", s.headers)).json().access.paid).toBe(false);
    expect(
      (await call("GET", "/admin/payments?status=REJECTED", teacher))
        .json()
        .some((x: { id: string }) => x.id === p.id),
    ).toBe(true);
  });

  it("T-109, BR-B05: oylik tushum faqat ustozga; tasdiqlangan to'lov summaga va ro'yxatga qo'shiladi", async () => {
    const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" })
      .format(new Date())
      .slice(0, 7);
    const income = async () =>
      (await call("GET", `/admin/income?month=${month}`, teacher)).json() as IncomeMonth;
    const before = await income();
    const s = await student();
    await prisma.user.update({ where: { id: s.id }, data: { firstName: "Tushum", lastName: "Bobur" } });
    const p = (await upload(s.headers, await plan(), PNG)).json() as { id: string };
    // Kutilayotgan chek tushumga kirmaydi
    expect((await income()).sumUzs).toBe(before.sumUzs);
    await call("POST", `/admin/payments/${p.id}/approve`, assistant);

    const after = await income();
    expect(after.count).toBe(before.count + 1);
    expect(after.sumUzs).toBe(before.sumUzs + 150_000);
    expect(after.rows.at(-1)).toMatchObject({ student: "Tushum Bobur", plan: "Oylik", amountUzs: 150_000 });
    expect(after.byPlan.find((x) => x.name === "Oylik")?.sumUzs).toBeGreaterThanOrEqual(150_000);
    // Boshqa oy
    expect((await call("GET", "/admin/income?month=2001-01", teacher)).json()).toMatchObject({
      count: 0,
      sumUzs: 0,
    });

    expect((await call("GET", `/admin/income?month=${month}`, assistant)).statusCode).toBe(403);
    expect((await call("GET", `/admin/income?month=${month}`, s.headers)).statusCode).toBe(403);
    expect((await call("GET", "/admin/income?month=2026-13", teacher)).statusCode).toBe(400);
    expect((await call("GET", `/admin/income?month=${month}`, {})).statusCode).toBe(401);
  });
});
