import { expect, test } from "@playwright/test";
import { E2E_OWNER } from "../playwright.config";
import { newTgId, openAsTelegram } from "./telegram";

test("T-158, T-168, BR-A06: ustoz Mini App'ni ochsa to'g'ridan-to'g'ri admin panel, o'quvchi ko'rinishi yo'q", async ({
  page,
}) => {
  await openAsTelegram(page, { id: newTgId(), first_name: "Ustoz", username: E2E_OWNER });
  await expect(page).toHaveURL(/127\.0\.0\.1:5191\/admin\/?$/);
  // initData manzil satrida qolmaydi
  expect(page.url()).not.toContain("tg=");
  await page.getByRole("button", { name: "Menyu", exact: true }).click();
  await expect(page.getByRole("link", { name: "AI yordamchi" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Oʻquvchi koʻrinishi" })).toHaveCount(0);
  await page.screenshot({ path: "e2e/.results/miniapp-staff-admin.png" });
});

test("T-168, BR-A06: ?view=student bilan ochilsa ham xodim admin panelga o'tadi", async ({ page }) => {
  await openAsTelegram(page, { id: newTgId(), first_name: "Ustoz", username: E2E_OWNER }, "/?view=student");
  await expect(page).toHaveURL(/127\.0\.0\.1:5191\/admin\/?$/);
});

test("T-158: o'quvchi Mini App'da qoladi, admin panelga yo'naltirilmaydi", async ({ page }) => {
  await openAsTelegram(page, { id: newTgId(), first_name: "Oddiy" });
  // Yangi o'quvchi ro'yxatdan o'tish sahifasini ko'radi
  await expect(page.getByRole("heading").first()).toBeVisible();
  await page.waitForTimeout(1000);
  expect(page.url()).toContain("127.0.0.1:5190");
});

test("T-158: admin panel bot havolasisiz, faqat soxta initData bilan ochilmaydi", async ({ page }) => {
  await page.goto("http://127.0.0.1:5191/admin/login#tg=query_id%3Dx%26user%3D%257B%257D%26hash%3Dabc");
  await expect(page.getByText("Kirib boʻlmadi")).toBeVisible();
  // Rad etilgan initData ham manzil satrida (tarix, skrinshot) qolmaydi
  expect(page.url()).not.toContain("tg=");
});
