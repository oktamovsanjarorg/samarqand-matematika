import { expect, test } from "@playwright/test";
import { acceptStaffInvite, createStudent, loginAdmin } from "./api";
import { newTgId } from "./telegram";

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

test("T-155: ustoz havola yaratadi, botga hech kirmagan odam uni ochib yordamchi boʻladi", async ({
  page,
  request,
}) => {
  await loginAdmin(page, request, "settings");
  // Test muhitida getMe yo'q: haqiqiy kod saqlanadi, havolaga bot nomi qo'yiladi
  await page.route("**/api/admin/staff/invite", async (route) => {
    const res = await route.fetch();
    const body = (await res.json()) as { code: string };
    await route.fulfill({
      response: res,
      json: { ...body, link: `https://t.me/samarqand_e2e_bot?start=s_${body.code}` },
    });
  });
  const card = page.getByTestId("staff-invite");
  await card.getByRole("button", { name: "Havola yaratish" }).click();
  const shown = card.getByTestId("staff-invite-link");
  await expect(shown).toContainText("s_");
  await expect(card).toContainText("Amal qiladi");
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "e2e/.results/admin-staff-invite.png", fullPage: true });
  const code = /s_([A-Za-z0-9_-]{22})/.exec((await shown.textContent()) ?? "")?.[1] ?? "";

  // Bot: /start s_<kod> (yangi Telegram foydalanuvchi)
  const name = `Taklif ${letters(Date.now()).replace(/^./, (c) => c.toUpperCase())}`;
  const res = await acceptStaffInvite(request, { id: newTgId(), first_name: name }, code);
  expect(res).toEqual({ status: "ok" });
  await page.reload();
  const row = page.getByTestId("staff").filter({ hasText: name });
  await expect(row).toContainText("oxirgi kirish");
  await row.getByRole("button", { name: `${name}: yordamchilikdan olish` }).click();
  await row.getByRole("button", { name: "Olib tashlansinmi?" }).click();
  await expect(row).toHaveCount(0);
});
