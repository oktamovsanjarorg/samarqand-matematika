import { expect, test } from "@playwright/test";
import { adminNav, loginAdmin } from "./api";

test("T-162: statistika sahifasi menyudan ochiladi; oy almashadi; 8 haftalik faollik", async ({
  page,
  request,
}) => {
  await loginAdmin(page, request);
  await adminNav(page, "Statistika");
  await expect(page).toHaveURL(/\/admin\/stats$/);
  await expect(page.getByRole("heading", { name: "Statistika" })).toBeVisible();
  await expect(page.getByText("Mavzu testlarida toʻgʻri")).toBeVisible();
  await expect(page.getByTestId("week-bar")).toHaveCount(8);
  await expect(page.getByLabel("Davomat guruhlar boʻyicha")).toBeVisible();
  await page.screenshot({ path: "e2e/.results/admin-stats.png", fullPage: true });

  // Bo'sh o'tgan oy: davomat yo'q yozuvi, so'rov shu oy bilan ketadi
  const req = page.waitForRequest((r) => r.url().includes("/admin/stats?month=2020-01"));
  await page.getByLabel("Oy").fill("2020-01");
  await req;
  await expect(page.getByText("Bu oyda davomat olinmagan")).toBeVisible();
});
