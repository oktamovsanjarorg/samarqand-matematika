import { expect, test } from "@playwright/test";
import { loginAdmin } from "./api";
import { seedMockBase } from "./mock-seed";
import { E2E_PREFIX } from "./telegram";

test("BR-M01: ustoz shablondan mock tuzadi, har bo'limga faqat mos turdagi savol tanlanadi", async ({
  page,
  request,
}) => {
  const s = await seedMockBase(request);
  const title = `${E2E_PREFIX}Dekabr mock ${s.stamp}`;
  await loginAdmin(page, request, "mocks");
  await page.getByRole("link", { name: "Yangi mock" }).click();
  await page.getByLabel("Nomi").fill(title);
  await page.getByLabel("Shablon").selectOption({ label: `${E2E_PREFIX}Shablon ${s.stamp}` });
  await expect(page.getByText("Vaqt: 30 daqiqa")).toBeVisible();

  const sections = page.getByTestId("mock-section");
  await expect(sections).toHaveCount(2);
  const save = page.getByRole("button", { name: "Saqlash" });
  await expect(save).toBeDisabled();
  for (const [i, text] of [
    [0, "3"],
    [1, "1"],
  ] as const) {
    const sec = sections.nth(i);
    await sec.getByLabel("Mavzu").selectOption({ label: `${s.course} · Aralash` });
    // Bo'limda faqat shablondagi turdagi savol ko'rinadi
    await expect(sec.getByTestId("pick")).toHaveCount(1);
    await sec.getByTestId("pick").filter({ hasText: text }).click();
  }
  await expect(sections.nth(0)).toContainText("1/1");
  await expect(sections.nth(1)).toContainText("1/1");
  await page.getByText("Nashr qilingan").click();
  await page.screenshot({ path: "e2e/.results/admin-mock-edit.png", fullPage: true });
  await save.click();

  const row = page.getByTestId("mock").filter({ hasText: title });
  await expect(row).toContainText(`${E2E_PREFIX}Shablon ${s.stamp} · 2 ta savol · topshirgan: 0`);
  await page.screenshot({ path: "e2e/.results/admin-mocks.png", fullPage: true });
  await row.click();
  await expect(page.getByText(`Shablon: ${E2E_PREFIX}Shablon ${s.stamp}`)).toBeVisible();
  await expect(page.getByTestId("mock-section").nth(1).getByTestId("selected")).toContainText("1");
});
