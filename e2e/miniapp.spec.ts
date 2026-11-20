import { expect, test } from "@playwright/test";
import { createStudent, sharePhone } from "./api";
import { newTgId, openAsTelegram } from "./telegram";

test.describe("Mini App", () => {
  test("Telegram'siz ochilsa tushunarli xato ko'rsatiladi", async ({ page }) => {
    await page.route("https://telegram.org/js/telegram-web-app.js", (r) => r.fulfill({ body: "" }));
    await page.goto("http://127.0.0.1:5190/");
    await expect(page.getByText("Ilovani Telegram ichida oching")).toBeVisible();
  });

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
    await nav.getByRole("link", { name: "Darslar" }).click();
    await expect(page).toHaveURL(/\/lessons$/);
    await nav.getByRole("link", { name: "Profil" }).click();
    await expect(page.getByText("Brauzer Testov")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
