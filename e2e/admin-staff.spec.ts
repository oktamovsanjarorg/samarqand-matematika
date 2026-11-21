import { expect, test } from "@playwright/test";
import { createStudent, loginAdmin } from "./api";

/** Ismda faqat harf bo'ladi (BR-S01): vaqtni harflarga aylantiramiz, har ishga tushishda boshqa ism */
const letters = (n: number) =>
  String(n)
    .split("")
    .map((d) => "abcdefghij"[Number(d)])
    .join("");

test("T-086, BR-A05: ustoz o'quvchini qidirib yordamchi qiladi va qaytarib oladi", async ({
  page,
  request,
}) => {
  const name = `Yordamchi ${letters(Date.now()).replace(/^./, (c) => c.toUpperCase())}`;
  await createStudent(request, { fullName: name });
  await loginAdmin(page, request, "settings");

  const staff = page.getByTestId("staff");
  await expect(staff.filter({ hasText: "Ustoz" }).first()).toBeVisible();
  await page.getByLabel("Yordamchi qidirish").fill(name);
  await page
    .getByTestId("staff-candidate")
    .filter({ hasText: name })
    .getByRole("button", { name: "Yordamchi qilish" })
    .click();
  const row = staff.filter({ hasText: name });
  await expect(row).toContainText("oxirgi kirish");
  await expect(page.getByLabel("Yordamchi qidirish")).toHaveValue("");
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "e2e/.results/admin-staff.png", fullPage: true });

  await row.getByRole("button", { name: `${name}: yordamchilikdan olish` }).click();
  await row.getByRole("button", { name: "Olib tashlansinmi?" }).click();
  await expect(row).toHaveCount(0);
});
