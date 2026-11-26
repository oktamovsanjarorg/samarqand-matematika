import { expect, test } from "@playwright/test";
import { adminHeaders, apiPost, createStudent, loginAdmin } from "./api";
import { E2E_PREFIX } from "./telegram";

/** Ismda raqam bo'lmaydi: vaqt belgisini harflarga aylantiramiz */
const tag = () => [...String(Date.now()).slice(-6)].map((d) => "abcdefghij"[Number(d)]).join("");

test("T-181, BR-G04: ustoz Q1..Qn jadvalini yuklaydi, tekshiradi, saqlaydi va moslanmaganni biriktiradi", async ({
  page,
  request,
}) => {
  const t = tag();
  const phone = `99897${String(Date.now()).slice(-7)}`;
  await createStudent(request, { fullName: `Telefonli Oquvchi${t}`, phone });
  await createStudent(request, { fullName: `Ismli Oquvchi${t}` });
  await createStudent(request, { fullName: `Qolgan Oquvchi${t}` });
  const csv = [
    "F.I.O;Telefon;Q1;Q2;Q3;Q4",
    `Boshqacha yozilgan;+${phone};1;1;1;1`,
    `ismli oquvchi${t};;1;0;1;`,
    `Q. Oquvchi${t};;0;0;;1`,
  ].join("\r\n");

  await loginAdmin(page, request, "offline");
  await page.getByLabel("Test nomi").fill(`${E2E_PREFIX}Offline ${t}`);
  await page
    .getByLabel("Excel yoki CSV fayl")
    .setInputFiles({ name: "natija.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "Tekshirish" }).click();
  const preview = page.getByTestId("offline-preview");
  await expect(preview).toContainText("3 qator, 2 tasi oʻquvchiga moslandi");
  await expect(preview.getByTestId("offline-row").first()).toContainText(`Telefonli Oquvchi${t}`);
  await expect(preview).toContainText("Q1..Qn jadval · 4 savol");
  await page.getByLabel("Fan boʻlimlari").fill("Algebra: 1, 2\nGeometriya: 3-5");
  await expect(page.getByText("testda 4 ta savol, 5 yoʻq")).toBeVisible();
  await expect(page.getByRole("button", { name: "Saqlash" })).toBeDisabled();
  await page.getByLabel("Fan boʻlimlari").fill("Algebra: 1, 2\nGeometriya: 3-4");
  await page.screenshot({ path: "e2e/.results/admin-offline-preview.png", fullPage: true });
  await page.getByRole("button", { name: "Saqlash" }).click();

  await expect(page.getByText("2/3 moslangan")).toBeVisible();
  await page.getByLabel(`Q. Oquvchi${t}: oʻquvchi`).fill(`Qolgan Oquvchi${t}`);
  await page.getByRole("button", { name: new RegExp(`Qolgan Oquvchi${t}`) }).click();
  await expect(page.getByText("3/3 moslangan")).toBeVisible();
  await expect(page.getByTestId("offline-row").first()).toContainText("100%");
  await expect(page.getByTestId("offline-sections")).toContainText("Algebra (1–2)");
  await page
    .getByTestId("offline-row")
    .filter({ hasText: `ismli oquvchi${t}` })
    .locator("button[aria-expanded]")
    .click();
  const card = page.getByTestId("offline-card");
  await expect(card).toContainText("Algebra · 1/2");
  await expect(card).toContainText("Eng zaif boʻlim");
  await page.getByRole("button", { name: "Xabar yuborish (3)" }).click();
  await expect(page.getByText(/Yuborildi: \d+ oʻquvchi/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Xabar yuborish" })).toBeDisabled();
  await page.screenshot({ path: "e2e/.results/admin-offline-test.png", fullPage: true });
});

test("T-181: tanilmagan fayl saqlanmaydi, sababi ko'rinadi", async ({ page, request }) => {
  await loginAdmin(page, request, "offline");
  await page.getByLabel("Test nomi").fill(`${E2E_PREFIX}Xato`);
  await page
    .getByLabel("Excel yoki CSV fayl")
    .setInputFiles({ name: "x.csv", mimeType: "text/csv", buffer: Buffer.from("Ism;A\nAli;abc") });
  await page.getByRole("button", { name: "Tekshirish" }).click();
  await expect(page.getByText("Fayl tanilmadi")).toBeVisible();
  await expect(page.getByRole("button", { name: "Saqlash" })).toHaveCount(0);
});

test("T-165, T-181: eski Excel (.xls) fayldan natija: son katak va bo'sh katak to'g'ri o'qiladi", async ({
  page,
  request,
}) => {
  await loginAdmin(page, request, "offline");
  await page.getByLabel("Test nomi").fill(`${E2E_PREFIX}Xls ${tag()}`);
  // xlwt bilan yaratilgan haqiqiy BIFF8 fayl (apps/admin/src/lib/fixtures/make-xls.py)
  await page.getByLabel("Excel yoki CSV fayl").setInputFiles("e2e/fixtures/offline-results.xls");
  await page.getByRole("button", { name: "Tekshirish" }).click();
  const preview = page.getByTestId("offline-preview");
  await expect(preview).toContainText("2 qator");
  await expect(preview.getByTestId("offline-row").first()).toContainText("75%");
  await page.screenshot({ path: "e2e/.results/admin-offline-xls.png", fullPage: true });
  await expect(page.getByRole("button", { name: "Saqlash" })).toBeEnabled();
});

test("T-182: reyting tabi moslangan o'quvchilarni o'rtacha ball bo'yicha ko'rsatadi", async ({
  page,
  request,
}) => {
  const t = tag();
  await createStudent(request, { fullName: `Reyting Birinchi${t}` });
  await createStudent(request, { fullName: `Reyting Ikkinchi${t}` });
  const admin = await adminHeaders(request);
  await apiPost(request, "/admin/offline-tests", admin, {
    title: `${E2E_PREFIX}Reyting ${t}`,
    date: "2026-11-25",
    csv: `Ism;Q1;Q2;Q3\nReyting Ikkinchi${t};1;0;0\nReyting Birinchi${t};1;1;1`,
    sections: [],
  });
  await loginAdmin(page, request, "offline");
  await page.getByRole("tab", { name: "Reyting" }).click();
  await page.getByRole("button", { name: "Hammasi" }).click();
  const list = page.getByTestId("offline-ranking");
  const first = list.getByRole("listitem").filter({ hasText: `Reyting Birinchi${t}` });
  const second = list.getByRole("listitem").filter({ hasText: `Reyting Ikkinchi${t}` });
  await expect(first).toContainText("1 ta test");
  const all = await list.getByRole("listitem").allInnerTexts();
  const pos = (name: string) => all.findIndex((x) => x.includes(name));
  expect(pos(`Reyting Birinchi${t}`)).toBeLessThan(pos(`Reyting Ikkinchi${t}`));
  await expect(second).toBeVisible();
  await page.screenshot({ path: "e2e/.results/admin-offline-ranking.png", fullPage: true });
});
