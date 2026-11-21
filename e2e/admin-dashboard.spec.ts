import { expect, test } from "@playwright/test";
import { PrismaClient } from "@samarqand/db";
import { createStudent, loginAdmin } from "./api";

test("T-061, T-105: bosh sahifada kutayotgan ishlar, bosilsa bo'limga o'tadi", async ({ page, request }) => {
  // Yangi (qabul qilinmagan) o'quvchi: "Yangi o'quvchilar" kartasi chiqadi
  await createStudent(request, { fullName: "Yangi Kelgan" });
  await loginAdmin(page, request);
  await expect(page.getByRole("heading", { name: "Bosh sahifa" })).toBeVisible();
  const card = page.getByTestId("todo").filter({ hasText: "Yangi oʻquvchilar" });
  await expect(card).toBeVisible();
  await expect(page.getByLabel("Holat")).toContainText("Oʻquvchilar");
  // T-105: muvaffaqiyat o'lchovlari
  await expect(page.getByLabel("Holat")).toContainText("Ota-onasi ulangan oʻquvchilar");
  // T-133: qayta ishlashda o'sish (bo'sh bazada "qayta ishlanmagan")
  await expect(page.getByLabel("Holat")).toContainText(
    /Mavzu testini qayta ishlaganda natija oshgan|qayta ishlanmagan/,
  );
  await expect(page.getByLabel("Holat")).toContainText(
    /topshirgan \(toʻliq kirishlilardan\)|Yopilgan haftalik test hali yoʻq/,
  );
  await page.screenshot({ path: "e2e/.results/admin-dashboard.png", fullPage: true });

  await page.setViewportSize({ width: 1366, height: 860 });
  await page.screenshot({ path: "e2e/.results/admin-dashboard-desktop.png" });
  await card.click();
  await expect(page).toHaveURL(/\/admin\/students$/);
});

test("T-063, BR-R02: bosh sahifada e'tibor kerak o'quvchi sababi bilan", async ({ page, request }) => {
  const s = await createStudent(request, { fullName: "Uzoq Yoqolgan", phone: "998901112281" });
  const prisma = new PrismaClient();
  try {
    await prisma.user.update({
      where: { telegramId: BigInt(s.tg) },
      data: {
        lastSeenAt: new Date(Date.now() - 9 * 24 * 3600_000),
        student: { update: { acceptedAt: new Date() } },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
  await loginAdmin(page, request);
  const row = page.getByTestId("attention-row").filter({ hasText: "Uzoq Yoqolgan" });
  await expect(row).toContainText("9 kundan beri ilovaga kirmagan");
  await expect(row.getByRole("link", { name: "+998901112281" })).toBeVisible();
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "e2e/.results/admin-attention.png", fullPage: true });
  // T-068: ismni bosganda o'quvchi kartasi
  await row.getByRole("link", { name: "Uzoq Yoqolgan" }).click();
  await expect(page).toHaveURL(/\/students\/[a-z0-9]+$/);
  await expect(page.getByTestId("card-status")).toContainText("9 kundan beri ilovaga kirmagan");
  await expect(page.getByTestId("card-status")).toContainText("Toʻliq kirish yopiq");
  // T-094: obuna holati
  await expect(page.getByTestId("card-status")).toContainText("Obuna toʻlanmagan");
  await expect(page.getByTestId("card-school")).toContainText("Guruhsiz");
  await expect(page.getByTestId("card-study")).toContainText("0 ta test");
  await page.screenshot({ path: "e2e/.results/admin-student-card.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: "e2e/.results/admin-student-card-desktop.png", fullPage: true });
});
