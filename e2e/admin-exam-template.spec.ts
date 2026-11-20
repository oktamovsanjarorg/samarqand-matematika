import { expect, test } from "@playwright/test";
import { loginAdmin } from "./api";
import { E2E_PREFIX } from "./telegram";

test("BR-M01: ustoz Milliy sertifikat taklifidan shablon yaratadi va tahrirlaydi", async ({
  page,
  request,
}) => {
  const name = `${E2E_PREFIX}Milliy ${Date.now()}`;
  await loginAdmin(page, request, "settings");
  await page.getByRole("button", { name: "Yangi shablon" }).click();
  const editor = page.getByTestId("exam-editor");
  await editor.getByRole("button", { name: "Milliy sertifikat taklifi" }).click();
  await expect(editor.getByTestId("exam-section")).toHaveCount(4);
  await expect(editor.getByTestId("exam-grade")).toHaveCount(6);
  await expect(editor.getByTestId("exam-summary")).toHaveText(
    "45 ta savol · eng yuqori xom ball 100.5 · 150 daqiqa",
  );

  // Xato: darajalar tartibi buzilsa saqlab bo'lmaydi
  await editor.getByLabel("2-daraja chegarasi").fill("80");
  await expect(editor.getByRole("alert")).toContainText("2-daraja");
  await expect(editor.getByRole("button", { name: "Saqlash" })).toBeDisabled();
  await editor.getByLabel("2-daraja chegarasi").fill("65");

  await editor.getByLabel("Shablon nomi").fill(name);
  await page.screenshot({ path: "e2e/.results/admin-exam-editor.png", fullPage: true });
  await editor.getByRole("button", { name: "Saqlash" }).click();
  const row = page.getByTestId("exam-template").filter({ hasText: name });
  await expect(row).toContainText("45 ta savol · 4 boʻlim · xom ball 100.5 · 150 daqiqa · shkala 75");
  await expect(row).toContainText("A+ 70+ · A 65+");

  await row.getByRole("button", { name: "Tahrirlash" }).click();
  await page.getByTestId("exam-editor").getByLabel("4-boʻlimni oʻchirish").click();
  await page.getByTestId("exam-editor").getByRole("button", { name: "Saqlash" }).click();
  await expect(row).toContainText("35 ta savol · 3 boʻlim · xom ball 68.5");
  await page.screenshot({ path: "e2e/.results/admin-exam-templates.png", fullPage: true });
});
