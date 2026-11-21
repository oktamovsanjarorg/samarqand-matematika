import { downloadText } from "./download";
import { expect, test } from "@playwright/test";
import { apiPost, createStudent, grantFree, loginAdmin } from "./api";
import { seedMock, seedMockBase } from "./mock-seed";
import { E2E_PREFIX } from "./telegram";

const API = "http://127.0.0.1:4300/api";

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

test("T-053b, T-076: ustoz mock natijalarini bo'limlar bo'yicha ko'radi", async ({ page, request }) => {
  const m = await seedMock(request);
  const s = await createStudent(request, { fullName: "Natija Mockchi", phone: "998901112252" });
  await grantFree(request, m.admin, "Natija Mockchi");
  const a = await apiPost<{ id: string }>(request, `/mocks/${m.id}/attempts`, s.headers, {});
  await request.put(`${API}/mock-attempts/${a.id}/answers/${m.numeric}`, {
    headers: s.headers,
    data: { response: { value: "0,75" } },
  });
  await apiPost(request, `/mock-attempts/${a.id}/submit`, s.headers, {});

  await loginAdmin(page, request, `mocks/${m.id}`);
  const results = page.getByTestId("mock-results");
  await expect(results).toContainText("Natijalar · topshirgan: 1");
  await expect(results).toContainText("Oyna ochiq: taxminiy");
  const row = results.getByTestId("mock-result-row").filter({ hasText: "Natija Mockchi" });
  await expect(row).toContainText("50/75");
  await expect(row).toContainText("C");
  // T-076: natijalar Excel'ga (CSV), bo'limlar ustunlari bilan
  const csv = await downloadText(page, results.getByRole("button", { name: "Excel'ga yuklab olish" }));
  expect(csv.text).toContain("#;Oʻquvchi;Topshirgan;Ball;Daraja;Xom ball");
  expect(csv.text).toContain(";Natija Mockchi;");
  await page.screenshot({ path: "e2e/.results/admin-mock-results.png", fullPage: true });
});
