import { expect, test } from "@playwright/test";
import { createStudent, grantFree, loginAdmin } from "./api";
import { openAsTelegram } from "./telegram";
import { notebookPng, seedWeekly, solveWeekly } from "./weekly-seed";

test("BR-W05, BR-W06: ustoz navbatda bir xil xatoni ko'radi, ball qo'yadi, o'quvchi izohni oladi", async ({
  page,
  request,
  browser,
}) => {
  const { admin, id, close } = await seedWeekly(request);
  const png = await notebookPng(browser);
  const a = await createStudent(request, { fullName: "Navbat Birinchi", phone: "998901112209" });
  const b = await createStudent(request, { fullName: "Navbat Ikkinchi", phone: "998901112210" });
  for (const n of ["Navbat Birinchi", "Navbat Ikkinchi"]) await grantFree(request, admin, n);
  await solveWeekly(request, a, { testId: id, png });
  await solveWeekly(request, b, { testId: id, png });

  await loginAdmin(page, request, `weekly/${id}/review`);
  await expect(page.getByRole("tab", { name: "Tekshirilmagan (4)" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Shubhali (2)" })).toBeVisible();
  const first = page.getByTestId("review-item").first();
  await expect(first).toContainText("Bir xil xato: yana 1 kishi");
  await expect(first).toContainText("Navbat Birinchi · 2-savol");
  await expect(first).toContainText("Avtomatik: 0 ball (yechim rasmi yoʻq)");
  await first.getByLabel("Izoh").fill("Daraja: 2·2·2 = 8, koʻpaytirishni tekshir");
  await first.getByRole("button", { name: "0 ball" }).click();
  await expect(page.getByRole("tab", { name: "Tekshirilmagan (3)" })).toBeVisible();
  const photoCard = page.getByTestId("review-item").filter({ hasText: "1-savol" }).first();
  await expect(photoCard.getByRole("img", { name: "Yechim rasmi 1" })).toBeVisible();
  await photoCard.getByRole("button", { name: "1 ball" }).click();
  await page.screenshot({ path: "e2e/.results/admin-review.png", fullPage: true });
  await page.getByRole("tab", { name: "Hammasi (4)" }).click();
  await expect(page.getByText("Ustoz: 0 ball")).toBeVisible();

  expect((await close()).ok()).toBe(true);
  await openAsTelegram(page, { id: a.tg, first_name: "Oquvchi" }, `/weekly/${id}`);
  await expect(page.getByTestId("score")).toContainText("1/2");
  await expect(page.getByTestId("feedback")).toContainText("Ustoz izohi: Daraja: 2·2·2 = 8");
  await page.screenshot({ path: "e2e/.results/miniapp-weekly-feedback.png", fullPage: true });
});
