import { expect, test } from "@playwright/test";
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
