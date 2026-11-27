import { expect, test } from "@playwright/test";
import { createStudent, loginAdmin } from "./api";

const letters = () => [...String(Date.now()).slice(-6)].map((d) => "abcdefghij"[Number(d)]).join("");
const phone9 = () => `93${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

test("T-186, BR-S07: ustoz o'quvchini qo'lda kiritadi, o'quvchi botda raqamini ulashganda bog'lanadi", async ({
  page,
  request,
}) => {
  const stamp = letters();
  const name = `Qoʻlda Kiritilgan${stamp}`;
  const phone = phone9();
  await loginAdmin(page, request, "students");

  await page.getByRole("button", { name: "Oʻquvchi qoʻshish" }).click();
  const form = page.getByTestId("manual-add");
  await form.getByLabel("Oʻquvchilar roʻyxati").fill(`${name}, ${phone}\nBittaism, 901112233`);
  await form.getByRole("button", { name: "Qoʻshish", exact: true }).click();
  const result = page.getByTestId("manual-result");
  await expect(result).toContainText("1 ta oʻquvchi qoʻshildi");
  await expect(result).toContainText("2-qator «Bittaism, 901112233»");
  await page.screenshot({ path: "e2e/.results/admin-manual-add.png", fullPage: true });

  await page.getByPlaceholder("Ism, username yoki telefon").fill(stamp);
  const row = page.getByTestId("student").filter({ hasText: name });
  await expect(row).toContainText("Telegramʼga ulanmagan");
  await expect(row).toContainText(`+998${phone}`);

  // O'quvchi botga kirib o'zi boshqa ism yozsa ham, raqam bo'yicha ustoz yozgan yozuvga bog'lanadi
  await createStudent(request, { fullName: `Boshqa Ism${stamp}`, phone: `998${phone}` });
  await page.reload();
  await page.getByPlaceholder("Ism, username yoki telefon").fill(stamp);
  await expect(page.getByTestId("student")).toHaveCount(1);
  await expect(row).not.toContainText("Telegramʼga ulanmagan");
  await expect(row).toContainText("oxirgi kirgan");
  await page.screenshot({ path: "e2e/.results/admin-manual-linked.png" });
});
