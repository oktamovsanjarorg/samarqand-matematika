import { expect, test } from "@playwright/test";
import { PrismaClient } from "@samarqand/db";
import { createStudent, loginAdmin } from "./api";

test("T-061: bosh sahifada kutayotgan ishlar, bosilsa bo'limga o'tadi", async ({ page, request }) => {
  // Yangi (qabul qilinmagan) o'quvchi: "Yangi o'quvchilar" kartasi chiqadi
  await createStudent(request, { fullName: "Yangi Kelgan" });
  await loginAdmin(page, request);
  await expect(page.getByRole("heading", { name: "Bosh sahifa" })).toBeVisible();
  const card = page.getByTestId("todo").filter({ hasText: "Yangi oʻquvchilar" });
  await expect(card).toBeVisible();
  await expect(page.getByLabel("Holat")).toContainText("Oʻquvchilar");
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
});
