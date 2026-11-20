import { expect, test } from "@playwright/test";
import { adminLink } from "./api";

test.describe("Admin panel", () => {
  test("havolasiz ochilsa botdan kirish yo'li ko'rsatiladi", async ({ page }) => {
    await page.goto("http://127.0.0.1:5191/admin/");
    await expect(page.getByText("/admin")).toBeVisible();
  });

  test("bir martalik havola bilan kiradi, havola ikkinchi marta ishlamaydi", async ({
    page,
    browser,
    request,
  }) => {
    const url = await adminLink(request);
    await page.goto(url);
    await expect(page).toHaveURL(/\/admin\/content$/);
    await expect(page.getByText("Ustoz").first()).toBeVisible();
    await page.screenshot({ path: "e2e/.results/admin-home.png" });

    const other = await browser.newPage();
    await other.goto(url);
    await expect(other.getByText(/ishlatilgan|eskirgan|yaroqsiz/i)).toBeVisible();
    await other.close();
  });

  test("sahifani yangilaganda sessiya saqlanadi", async ({ page, request }) => {
    await page.goto(await adminLink(request));
    await expect(page.getByText("Ustoz").first()).toBeVisible();
    await page.reload();
    await expect(page.getByText("Ustoz").first()).toBeVisible();
  });
});
