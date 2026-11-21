import type { AdminPayment, BillingView, MyPayment } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
let planId: string;
const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(32)]);

beforeAll(async () => {
  f = await weeklyFixture();
  planId = (
    await f.prisma.plan.create({ data: { name: "Ota-ona tarifi", priceUzs: 120_000, durationDays: 30 } })
  ).id;
});
afterAll(async () => {
  const ids = (
    await f.prisma.payment.findMany({ where: { planId }, select: { id: true, userId: true } })
  ).map((p) => p.userId);
  await f.prisma.subscription.deleteMany({ where: { userId: { in: ids } } });
  await f.prisma.payment.deleteMany({ where: { planId } });
  await f.prisma.plan.delete({ where: { id: planId } });
  await f.cleanup();
});

/** Farzand va unga bog'langan ota-ona; studentId: StudentProfile.id (kabinet manzili) */
async function family(status: "APPROVED" | "PENDING" = "APPROVED") {
  const child = await f.student();
  await f.prisma.user.update({ where: { id: child.id }, data: { firstName: "Farzand", lastName: "Ota" } });
  const parent = await f.student(false);
  await f.prisma.user.update({ where: { id: parent.id }, data: { role: "PARENT", firstName: "Ona" } });
  const { id: studentId } = await f.prisma.studentProfile.findUniqueOrThrow({
    where: { userId: child.id },
    select: { id: true },
  });
  await f.prisma.parentLink.create({
    data: { parentId: parent.id, studentId, status, phone: "998900000004" },
  });
  return { child, parent, base: `/me/children/${studentId}/billing` };
}

const upload = (headers: Record<string, string>, url: string) =>
  f.app.inject({
    method: "POST",
    url: `/api${url}/payments?planId=${planId}`,
    headers: { ...headers, "content-type": "image/png" },
    payload: PNG,
  });

describe("ota-ona farzandi uchun toʻlaydi (T-120, BR-B07)", () => {
  it("chek farzandga yoziladi; ustozga 'ota-onasi yubordi'; tasdiq ikkalasiga boradi", async () => {
    const { child, parent, base } = await family();
    const view = (await f.call("GET", base, parent.headers)).json() as BillingView;
    expect(view.plans.some((p) => p.id === planId)).toBe(true);

    const res = await upload(parent.headers, base);
    expect(res.statusCode).toBe(201);
    expect((res.json() as MyPayment).byParent).toBe(true);
    // Bitta kutilayotgan chek farzand bo'yicha: o'quvchi ham, ota-ona ham ikkinchisini yubora olmaydi (BR-B02)
    expect((await upload(child.headers, "/billing")).statusCode).toBe(409);
    expect(f.messagesTo(f.teacherTg).at(-1)).toContain("Farzand Ota</b> (ota-onasi yubordi)");

    const mine = (await f.call("GET", "/billing", child.headers)).json() as BillingView;
    expect(mine.payments[0]).toMatchObject({ byParent: true, status: "PENDING" });
    const list = (await f.call("GET", "/admin/payments?status=PENDING", f.teacher)).json() as AdminPayment[];
    const p = list.find((x) => x.student.id === child.id);
    expect(p?.submittedBy).toBe("Ona");

    expect((await f.call("POST", `/admin/payments/${p?.id}/approve`, f.teacher, {})).statusCode).toBe(200);
    expect(f.messagesTo(child.telegramId).at(-1)).toContain("Toʻlovingiz tasdiqlandi");
    expect(f.messagesTo(parent.telegramId).at(-1)).toContain("<b>Farzand Ota</b> uchun toʻlov tasdiqlandi");
    const after = (await f.call("GET", base, parent.headers)).json() as BillingView;
    expect(after.subscription).not.toBeNull();
  });

  it("rad etilsa sabab ota-onaga ham boradi; ota-ona faqat o'zi yuborgan chekni bekor qiladi", async () => {
    const { child, parent, base } = await family();
    const own = (await upload(child.headers, "/billing")).json() as MyPayment;
    expect((await f.call("DELETE", `${base}/payments/${own.id}`, parent.headers)).statusCode).toBe(404);
    expect((await f.call("DELETE", `/billing/payments/${own.id}`, child.headers)).statusCode).toBe(204);

    const sent = (await upload(parent.headers, base)).json() as MyPayment;
    const reject = await f.call("POST", `/admin/payments/${sent.id}/reject`, f.teacher, {
      reason: "Summa kam",
    });
    expect(reject.statusCode).toBe(200);
    expect(f.messagesTo(parent.telegramId).at(-1)).toContain("Sabab: Summa kam");
    // T-122: tugma farzandning to'lov sahifasiga
    expect(f.buttonsTo(parent.telegramId).at(-1)?.url).toContain(`/children/${base.split("/")[3]}/billing`);

    const again = (await upload(parent.headers, base)).json() as MyPayment;
    expect((await f.call("DELETE", `${base}/payments/${again.id}`, parent.headers)).statusCode).toBe(204);
  });

  it("tasdiqlanmagan yoki begona farzand 404; o'quvchi va ustozga ota-ona yo'li 403; tokensiz 401", async () => {
    const pending = await family("PENDING");
    expect((await f.call("GET", pending.base, pending.parent.headers)).statusCode).toBe(404);
    expect((await upload(pending.parent.headers, pending.base)).statusCode).toBe(404);
    const other = await family();
    expect((await f.call("GET", other.base, pending.parent.headers)).statusCode).toBe(404);
    expect((await f.call("GET", other.base, other.child.headers)).statusCode).toBe(403);
    expect((await f.call("GET", other.base, f.teacher)).statusCode).toBe(403);
    expect((await f.call("GET", other.base, {})).statusCode).toBe(401);
  });
});
