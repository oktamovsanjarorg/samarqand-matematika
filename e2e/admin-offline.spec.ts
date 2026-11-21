import { expect, test } from "@playwright/test";
import { createStudent, loginAdmin } from "./api";
import { E2E_PREFIX } from "./telegram";

/** Ismda raqam bo'lmaydi: vaqt belgisini harflarga aylantiramiz */
const tag = () => [...String(Date.now()).slice(-6)].map((d) => "abcdefghij"[Number(d)]).join("");

test("T-056, BR-G04: ustoz CSV yuklaydi, tekshiradi, saqlaydi va moslanmaganni biriktiradi", async ({
  page,
  request,
}) => {
  const t = tag();
  const phone = `99897${String(Date.now()).slice(-7)}`;
  await createStudent(request, { fullName: `Telefonli Oquvchi${t}`, phone });
  await createStudent(request, { fullName: `Ismli Oquvchi${t}` });
  await createStudent(request, { fullName: `Qolgan Oquvchi${t}` });
  const csv = [
    "F.I.O;Telefon;Algebra;Geometriya",
    `Boshqacha yozilgan;+${phone};12,5;8`,
    `ismli oquvchi${t};;7;6`,
    `Q. Oquvchi${t};;3;`,
  ].join("\r\n");

  await loginAdmin(page, request, "offline");
  await page.getByLabel("Test nomi").fill(`${E2E_PREFIX}Offline ${t}`);
  await page
    .getByLabel("CSV fayl")
    .setInputFiles({ name: "natija.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "Tekshirish" }).click();
  const preview = page.getByTestId("offline-preview");
  await expect(preview).toContainText("3 qator, 2 tasi oʻquvchiga moslandi");
  await expect(preview.getByTestId("offline-row").first()).toContainText(`Telefonli Oquvchi${t}`);
  await page.screenshot({ path: "e2e/.results/admin-offline-preview.png", fullPage: true });
  await page.getByRole("button", { name: "Saqlash" }).click();

  await expect(page.getByText("2/3 moslangan")).toBeVisible();
  await page.getByLabel(`Q. Oquvchi${t}: oʻquvchi`).fill(`Qolgan Oquvchi${t}`);
  await page.getByRole("button", { name: new RegExp(`Qolgan Oquvchi${t}`) }).click();
  await expect(page.getByText("3/3 moslangan")).toBeVisible();
  await expect(page.getByTestId("offline-row").first()).toContainText("20,5");
  await page.screenshot({ path: "e2e/.results/admin-offline-test.png", fullPage: true });
});

test("T-056: xatoli CSV saqlanmaydi, qator raqami ko'rinadi", async ({ page, request }) => {
  await loginAdmin(page, request, "offline");
  await page.getByLabel("Test nomi").fill(`${E2E_PREFIX}Xato`);
  await page
    .getByLabel("CSV fayl")
    .setInputFiles({ name: "x.csv", mimeType: "text/csv", buffer: Buffer.from("Ism;A\nAli;abc") });
  await page.getByRole("button", { name: "Tekshirish" }).click();
  await expect(page.getByTestId("offline-preview")).toContainText('2-qator: 1-boʻlim balli son emas: "abc"');
  await expect(page.getByRole("button", { name: "Saqlash" })).toBeDisabled();
});
