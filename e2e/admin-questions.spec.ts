import { expect, test, type Page } from "@playwright/test";
import { adminHeaders, adminNav, apiPost, loginAdmin } from "./api";
import { E2E_PREFIX } from "./telegram";

/** Moslashtirish: juft tanlanmasa xato, tanlansa saqlanadi */
async function addMatching(page: Page) {
  await page.getByRole("link", { name: "Yangi savol" }).click();
  await page.getByLabel("Savol turi").selectOption("MATCHING");
  await page.getByLabel("Savol matni").fill("Kasrni oʻnli kasrga moslang");
  const pairs = [
    ["A", "1", "1/2", "0,5"],
    ["B", "2", "1/4", "0,25"],
    ["C", "3", "3/4", "0,75"],
  ] as const;
  for (const [l, r, left, right] of pairs) {
    await page.getByLabel(`Chap ${l}`).fill(left);
    await page.getByLabel(`Oʻng ${r}`).fill(right);
  }
  await page.getByLabel("A juft").selectOption("1");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByRole("alert")).toContainText("Har chap element uchun juft kerak");
  await page.getByLabel("B juft").selectOption("2");
  await page.getByLabel("C juft").selectOption("3");
  await page.getByRole("button", { name: "Saqlash" }).click();
}

test("BR-Q01..Q03: ustoz savol yaratadi, tahrirlaydi, tartiblaydi", async ({ page, request }) => {
  const admin = await adminHeaders(request);
  const course = await apiPost<{ id: string }>(request, "/admin/courses", admin, {
    title: `${E2E_PREFIX}Savollar ${Date.now()}`,
  });
  const topic = await apiPost<{ id: string }>(request, `/admin/courses/${course.id}/topics`, admin, {
    title: "Kasrlar",
  });

  await loginAdmin(page, request, `content/topics/${topic.id}/questions`);
  await expect(page.getByRole("heading", { name: "Savollar: Kasrlar" })).toBeVisible();
  await expect(page.getByText("Savol yoʻq")).toBeVisible();

  // 1) Bitta javobli, formula bilan; bo'sh variant bo'lsa server rad etadi
  await page.getByRole("link", { name: "Yangi savol" }).click();
  await page.getByLabel("Savol matni").fill("Hisoblang: $\\frac{1}{2} + \\frac{1}{4}$");
  await expect(page.getByTestId("preview").locator(".katex")).toBeVisible();
  await page.getByLabel("A variant", { exact: true }).fill("$\\frac{3}{4}$");
  await page.getByLabel("B variant", { exact: true }).fill("$\\frac{2}{6}$");
  await page.getByLabel("C variant", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByRole("alert")).toHaveText("D variant: Matn kerak");
  await page.getByRole("button", { name: "D variantni oʻchirish" }).click();
  await expect(page.getByTestId("option")).toHaveCount(3);
  await page.getByLabel("A toʻgʻri").check();
  await page.getByText("Nashr qilingan (testga tushadi)").click();
  await page.screenshot({ path: "e2e/.results/admin-question-edit.png", fullPage: true });
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByTestId("question")).toHaveCount(1);

  // 2) Son javobli
  await page.getByRole("link", { name: "Yangi savol" }).click();
  await page.getByLabel("Savol turi").selectOption("NUMERIC");
  await page.getByLabel("Savol matni").fill("$0{,}5 + 0{,}25$ ni kasr koʻrinishida yozing");
  await page.getByLabel("Toʻgʻri javob").fill("3/4");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByTestId("question")).toHaveCount(2);

  await addMatching(page);
  const rows = page.getByTestId("question");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("Bitta javob");
  await expect(rows.nth(1)).toContainText("Qoralama");

  // Tartib: oxirgisini yuqoriga
  await rows
    .nth(2)
    .getByRole("button", { name: /yuqoriga/ })
    .click();
  await expect(rows.nth(1)).toContainText("Moslashtirish");
  await page.screenshot({ path: "e2e/.results/admin-questions.png", fullPage: true });

  // Tahrirlash: saqlangan qiymatlar qaytadi
  await rows.nth(0).getByRole("link").click();
  await expect(page.getByRole("heading", { name: "Savolni tahrirlash" })).toBeVisible();
  await expect(page.getByLabel("A toʻgʻri")).toBeChecked();
  await page.getByLabel("B toʻgʻri").check();
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByTestId("question")).toHaveCount(3);

  await adminNav(page, "Kontent");
  await expect(page.getByRole("link", { name: "Mavzu testi savollari (3)" })).toBeVisible();
});
