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

test("T-140: ustozga 'Ishni boshlash' ro'yxati; hammasi bajarilsa yo'qoladi", async ({ page, request }) => {
  let setup = { course: true, lesson: false, questions: false, billing: false, student: false };
  // Baza holatiga bog'lanmaslik uchun faqat setup qismini almashtiramiz, qolgani serverdan
  await page.route("**/api/admin/dashboard", async (route) => {
    const res = await route.fetch();
    route.fulfill({ response: res, json: { ...((await res.json()) as object), setup } });
  });
  await loginAdmin(page, request);
  const list = page.getByRole("region", { name: "Ishni boshlash" });
  await expect(list).toContainText("1/5");
  await expect(list.getByTestId("setup-step")).toHaveCount(5);
  await expect(list.locator('[data-done="true"]')).toContainText("Kurs va mavzu yarating");
  await page.screenshot({ path: "e2e/.results/admin-setup.png", fullPage: true });
  await list.getByRole("link", { name: /Tarif va karta raqamini kiriting/ }).click();
  await expect(page).toHaveURL(/\/settings$/);

  setup = { course: true, lesson: true, questions: true, billing: true, student: true };
  await page.goto("http://127.0.0.1:5191/admin/");
  await expect(page.getByRole("region", { name: "Kutayotgan ishlar" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Ishni boshlash" })).toHaveCount(0);
});

test("T-143: bosh sahifada o'quvchilarni taklif qilish havolasi, nusxa va ulashish", async ({
  page,
  request,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  // e2e'da bot Telegram'ga chiqmaydi (bot nomi yo'q): havolani shu yerda beramiz
  await page.route("**/api/admin/dashboard/invite", (route) =>
    route.fulfill({ json: { link: "https://t.me/samarqand_e2e_bot" } }),
  );
  await loginAdmin(page, request);
  const card = page.getByTestId("invite");
  await expect(card.getByTestId("invite-link")).toHaveText("https://t.me/samarqand_e2e_bot");
  await expect(card.getByRole("link", { name: "Telegramʼda ulashish" })).toHaveAttribute(
    "href",
    /^https:\/\/t\.me\/share\/url\?url=https%3A%2F%2Ft\.me%2Fsamarqand_e2e_bot&text=/,
  );
  await card.getByRole("button", { name: "Nusxa olish" }).click();
  await expect(card.getByRole("button", { name: "Nusxa olindi" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("https://t.me/samarqand_e2e_bot");
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "e2e/.results/admin-invite.png" });

  // Bot nomi aniqlanmasa karta ko'rinmaydi
  await page.unroute("**/api/admin/dashboard/invite");
  await page.route("**/api/admin/dashboard/invite", (route) => route.fulfill({ json: { link: null } }));
  await page.reload();
  await expect(page.getByLabel("Holat")).toBeVisible();
  await expect(page.getByTestId("invite")).toHaveCount(0);
});
