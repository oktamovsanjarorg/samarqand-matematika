import { expect, test } from "@playwright/test";
import { createStudent, loginAdmin } from "./api";
import { E2E_PREFIX } from "./telegram";

test("T-054: ustoz guruh tuzadi, o'quvchini qidirib qo'shadi va chiqaradi", async ({ page, request }) => {
  const name = `${E2E_PREFIX}Guruh ${Date.now()}`;
  await createStudent(request, { fullName: "Guruhli Oquvchi", phone: "998901112261" });
  await loginAdmin(page, request, "groups");
  await page.getByLabel("Guruh nomi").fill(name);
  await page.getByLabel("Jadval").fill("Du/Chor/Ju 14:00");
  await page.getByRole("button", { name: "Qoʻshish" }).click();
  const row = page.getByTestId("group").filter({ hasText: name });
  await expect(row).toContainText("Du/Chor/Ju 14:00 · 0 oʻquvchi");
  await row.click();

  await page.getByLabel("Oʻquvchini qidirish").fill("Guruhli");
  const candidate = page.getByTestId("candidate").filter({ hasText: "Guruhli Oquvchi" }).first();
  await candidate.getByRole("button", { name: "Qoʻshish" }).click();
  const members = page.getByTestId("members");
  await expect(members).toContainText("Oʻquvchilar (1)");
  await expect(members).toContainText("Guruhli Oquvchi");
  await expect(page.getByText("Topilganlar shu guruhda")).toBeVisible();
  await page.screenshot({ path: "e2e/.results/admin-group.png", fullPage: true });

  await page.getByRole("link", { name: "Oʻquvchilar" }).click();
  await page.getByPlaceholder("Ism, username yoki telefon").fill("Guruhli");
  await expect(page.getByTestId("student").filter({ hasText: "Guruhli Oquvchi" }).first()).toContainText(
    name,
  );

  await page.getByRole("link", { name: "Guruhlar" }).click();
  await row.click();
  await page.getByLabel("Guruhli Oquvchini guruhdan chiqarish").click();
  await expect(members).toContainText("Oʻquvchilar (0)");
});
