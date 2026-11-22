import { expect, test } from "@playwright/test";
import { createStudent, sharePhone } from "./api";
import { violations } from "./axe";
import { newTgId, openAsTelegram } from "./telegram";

test("T-166: Telegram'siz ochilsa landing: bot tugmasi, kontent soni, ustoz kirishi; WCAG AA", async ({
  page,
}) => {
  await page.route("https://telegram.org/js/telegram-web-app.js", (r) => r.fulfill({ body: "" }));
  await page.goto("http://127.0.0.1:5190/");
  // Haqiqiy API: test muhitida bot yo'q, tugma ko'rinmaydi, sahifa baribir ochiladi
  await expect(page.getByRole("heading", { level: 1, name: "Samarqand matematika" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ustoz va yordamchilar uchun kirish" })).toHaveAttribute(
    "href",
    "/admin/",
  );
  await expect(page.getByRole("link", { name: "Telegramʼda ochish" })).toHaveCount(0);

  await page.route("**/api/public/landing", (r) =>
    r.fulfill({
      json: { botLink: "https://t.me/sinov_bot", content: { topics: 4, lessons: 12, questions: 230 } },
    }),
  );
  await page.reload();
  await expect(page.getByRole("link", { name: "Telegramʼda ochish" })).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Telegramʼda ochish" }).first()).toHaveAttribute(
    "href",
    "https://t.me/sinov_bot",
  );
  await expect(page.getByLabel("Platformada")).toContainText("230test savoli");
  expect(await violations(page, "landing")).toEqual([]);
  await page.screenshot({ path: "e2e/.results/landing.png", fullPage: true });
});

test.describe("Mini App", () => {
  test("BR-S01, BR-S02, BR-S04: yangi o'quvchi onboarding'dan o'tadi", async ({ page, request }) => {
    const id = newTgId();
    await openAsTelegram(page, { id, first_name: "Yangi" });
    await expect(page.getByText("1/2-qadam")).toBeVisible();
    const name = page.getByPlaceholder("Masalan: Aziz Karimov");
    await name.fill("Aziz");
    await expect(page.getByText(/Ism va familiyani/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Davom etish" })).toBeDisabled();
    await name.fill("Aziz Karimov");
    await page.getByRole("button", { name: "Davom etish" }).click();

    await expect(page.getByText("2/2-qadam")).toBeVisible();
    await page.screenshot({ path: "e2e/.results/miniapp-onboarding.png" });
    await page.getByRole("button", { name: "Raqamni ulashish" }).click();
    await expect(page.getByText("Raqam kutilmoqda…")).toBeVisible();
    await sharePhone(request, id, "998901112200");
    await expect(page.getByRole("navigation")).toBeVisible({ timeout: 10_000 });
  });

  test("onboarding'dan o'tgan o'quvchi uchta tab orasida yuradi", async ({ page, request }) => {
    const s = await createStudent(request, { fullName: "Brauzer Testov", phone: "998901112201" });
    await openAsTelegram(page, { id: s.tg, first_name: "Oquvchi" });
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link")).toHaveText(["Darslar", "Asosiy", "Profil"]);
    // BR-A04: qabul qilinmagan o'quvchi nima yetishmayotganini ko'radi
    const access = page.getByTestId("access");
    await expect(access).toContainText("Ustoz qabul qildi");
    await expect(access.getByLabel("Kutilmoqda")).toHaveCount(3);
    await expect(page.getByTestId("first-step")).toBeVisible();
    await page.screenshot({ path: "e2e/.results/miniapp-home-new.png" });
    await nav.getByRole("link", { name: "Darslar" }).click();
    await expect(page).toHaveURL(/\/lessons$/);
    await nav.getByRole("link", { name: "Profil" }).click();
    await expect(page.getByText("Brauzer Testov")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
