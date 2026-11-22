import { PrismaClient } from "@samarqand/db";
import { expect, test } from "@playwright/test";
import { adminHeaders, apiPost, createStudent, requestParentLink } from "./api";
import { E2E_PREFIX, openAsTelegram } from "./telegram";

const API = "http://127.0.0.1:4300/api";
const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(64)]);

async function approveLink(studentTg: number) {
  const prisma = new PrismaClient();
  try {
    const st = await prisma.studentProfile.findFirstOrThrow({
      where: { user: { telegramId: BigInt(studentTg) } },
      select: { id: true },
    });
    await prisma.parentLink.updateMany({ where: { studentId: st.id }, data: { status: "APPROVED" } });
  } finally {
    await prisma.$disconnect();
  }
}

test("T-121, BR-B07: ota-ona kabinetdan farzandi uchun chek yuboradi, ustoz kim yuborganini koʻradi", async ({
  page,
  request,
}) => {
  const admin = await adminHeaders(request);
  const plan = `${E2E_PREFIX}Ota tarifi ${Date.now()}`;
  await apiPost(request, "/admin/plans", admin, { name: plan, priceUzs: 150_000, durationDays: 30 });
  await request.put(`${API}/admin/billing-card`, {
    headers: admin,
    data: { number: "8600000000000000", holder: `${E2E_PREFIX}Ustoz` },
  });
  const s = await createStudent(request, { fullName: "Tolov Farzand", phone: "998901112401" });
  const parent = await requestParentLink(request, s.tg, "998935550401");
  await approveLink(s.tg);

  await openAsTelegram(page, { id: parent.id, first_name: "Ona" }, "/");
  const child = page.getByTestId("child").filter({ hasText: "Tolov Farzand" });
  await child.getByRole("link", { name: "Obunani toʻlash" }).click();
  await expect(page.getByRole("heading", { name: "Farzand obunasi" })).toBeVisible();
  await page.getByRole("radio", { name: new RegExp(plan) }).click();
  await expect(page.getByTestId("card")).toContainText("8600 0000 0000 0000");
  await page.getByLabel("Chek rasmi").setInputFiles({ name: "chek.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Chekni yuborish" }).click();
  await expect(page.getByTestId("pending")).toBeVisible();
  await expect(page.getByTestId("history")).toContainText("Tekshirilmoqda");
  await expect(page.getByRole("button", { name: "Chekni bekor qilish" })).toBeVisible();
  await page.screenshot({ path: "e2e/.results/miniapp-parent-billing.png", fullPage: true });

  const list = (await (await request.get(`${API}/admin/payments`, { headers: admin })).json()) as {
    student: { name: string };
    submittedBy: string | null;
  }[];
  expect(list.find((p) => p.student.name === "Tolov Farzand")?.submittedBy).toBeTruthy();

  // Farzand o'z sahifasida chekni ota-onasi yuborganini ko'radi
  await openAsTelegram(page, { id: s.tg, first_name: "Farzand" }, "/billing");
  await expect(page.getByTestId("history")).toContainText("Ota-onangiz yubordi");
});
