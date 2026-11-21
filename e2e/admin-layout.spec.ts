import { expect, test } from "@playwright/test";
import { loginAdmin } from "./api";

test("T-060: telefonda menyu ochiladi va bo'limga o'tadi, kompyuterda yon panel", async ({
  page,
  request,
}) => {
  await loginAdmin(page, request, "content");
  const nav = page.getByRole("navigation", { name: "Boʻlimlar" });
  await expect(nav).toBeHidden();
  await page.getByRole("button", { name: "Menyu", exact: true }).click();
  await expect(nav.getByRole("link", { name: "Sozlamalar" })).toBeVisible();
  await page.screenshot({ path: "e2e/.results/admin-menu-mobile.png" });
  await nav.getByRole("link", { name: "Guruhlar", exact: true }).click();
  await expect(nav).toBeHidden();
  await expect(page.getByRole("banner")).toContainText("Guruhlar");

  await page.setViewportSize({ width: 1366, height: 860 });
  await expect(nav.getByRole("link", { name: "Guruhlar", exact: true })).toHaveClass(/bg-brand/);
  await expect(page.getByRole("button", { name: "Menyu", exact: true })).toBeHidden();
  await page.screenshot({ path: "e2e/.results/admin-desktop.png" });
});
