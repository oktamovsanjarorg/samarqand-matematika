import { expect, test } from "@playwright/test";
import { newTgId, openAsTelegram } from "./telegram";

test.describe("Mini App", () => {
  test("Telegram'siz ochilsa tushunarli xato ko'rsatiladi", async ({ page }) => {
    await page.route("https://telegram.org/js/telegram-web-app.js", (r) => r.fulfill({ body: "" }));
    await page.goto("http://127.0.0.1:5190/");
    await expect(page.getByText("Ilovani Telegram ichida oching")).toBeVisible();
  });

  test("o'quvchi kiradi va uchta tab orasida yuradi", async ({ page }) => {
    await openAsTelegram(page, { id: newTgId(), first_name: "Brauzer" });
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link")).toHaveText(["Darslar", "Asosiy", "Profil"]);

    await nav.getByRole("link", { name: "Darslar" }).click();
    await expect(page).toHaveURL(/\/lessons$/);
    await nav.getByRole("link", { name: "Profil" }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByText("Brauzer").first()).toBeVisible();
    await page.screenshot({ path: "e2e/.results/miniapp-profile.png" });
  });

  test("gorizontal scroll yo'q (telefon kengligi)", async ({ page }) => {
    await openAsTelegram(page, { id: newTgId(), first_name: "Kenglik" });
    await expect(page.getByRole("navigation")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
