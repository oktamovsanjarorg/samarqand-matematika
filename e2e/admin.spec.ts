import { expect, test } from "@playwright/test";
import { internalKey } from "@samarqand/shared/server";
import { E2E_OWNER } from "../playwright.config";
import { newTgId } from "./telegram";

/** Bot /admin buyrug'idagidek bir martalik kirish havolasini oladi */
async function adminLink(request: import("@playwright/test").APIRequestContext) {
  const res = await request.post("http://127.0.0.1:4300/api/internal/admin-login-link", {
    headers: { "x-internal-key": internalKey(process.env.BOT_TOKEN ?? "") },
    data: { id: newTgId(), first_name: "Ustoz", username: E2E_OWNER },
  });
  expect(res.ok()).toBe(true);
  const { url } = (await res.json()) as { url: string | null };
  expect(url).toContain("#t=");
  return url as string;
}

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
    await expect(page).toHaveURL(/\/admin\/?$/);
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
