import { expect, test } from "@playwright/test";
import { loginAdmin } from "./api";
import { E2E_PREFIX } from "./telegram";

test("BR-C01..C03: kurs, mavzu va dars yaratish, formula ko'rinishi, nashr", async ({ page, request }) => {
  const course = `${E2E_PREFIX}Algebra ${Date.now()}`;
  await loginAdmin(page, request, "content");

  await page.getByPlaceholder("Yangi kurs nomi").fill(course);
  await page.getByRole("button", { name: "Kurs" }).click();
  const card = page.getByTestId("course").filter({ hasText: course });
  await expect(card.getByText("Qoralama")).toBeVisible();

  await card.getByPlaceholder("Yangi mavzu nomi").fill("Kasrlar");
  await card.getByRole("button", { name: "Mavzu" }).click();
  const topic = card.getByTestId("topic").filter({ hasText: "Kasrlar" });
  await topic.getByPlaceholder("Yangi dars nomi").fill("Kasrlarni qo'shish");
  await topic.getByRole("button", { name: "Dars" }).click();

  await expect(page).toHaveURL(/\/content\/lessons\//);
  await page.getByLabel("Konspekt").fill("Yig'indi: $\\frac{1}{2} + \\frac{1}{4} = \\frac{3}{4}$");
  await expect(page.getByTestId("preview").locator(".katex")).toBeVisible();
  await page.getByLabel("Bepul dars").check();
  await page.getByLabel("Nashr qilingan").check();
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByText("Saqlandi")).toBeVisible();
  await page.screenshot({ path: "e2e/.results/admin-lesson-editor.png", fullPage: true });

  await page.getByRole("link", { name: "Kontent" }).first().click();
  const row = page.getByTestId("course").filter({ hasText: course }).getByTestId("lesson-row");
  await expect(row.getByText("Bepul")).toBeVisible();
  await expect(row.getByText("Qoralama")).toHaveCount(0);

  // BR-C03: darsi bor mavzu o'chmaydi, xabar ko'rinadi
  const t = page.getByTestId("course").filter({ hasText: course }).getByTestId("topic");
  await t.getByRole("button", { name: "Kasrlar: oʻchirish" }).click();
  await t.getByRole("button", { name: "Oʻchirilsinmi?" }).click();
  await expect(t.getByText("Mavzu boʻsh emas: avval ichidagilarni oʻchiring")).toBeVisible();

  await page
    .getByTestId("course")
    .filter({ hasText: course })
    .getByRole("button", { name: "Nashr qilish" })
    .click();
  await expect(
    page.getByTestId("course").filter({ hasText: course }).getByText("Nashr qilingan"),
  ).toBeVisible();
  await page.screenshot({ path: "e2e/.results/admin-content.png", fullPage: true });
});
