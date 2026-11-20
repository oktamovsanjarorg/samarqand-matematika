import { expect, test } from "@playwright/test";
import { createStudent, grantFree } from "./api";
import { openAsTelegram } from "./telegram";
import { notebookPng, seedWeekly, solveWeekly } from "./weekly-seed";

test("BR-W08, BR-W10: test yopilgach o'quvchi reytingdagi o'rnini ko'radi, boshqalar ismi qisqa", async ({
  page,
  request,
  browser,
}) => {
  const { admin, id, close } = await seedWeekly(request);
  const png = await notebookPng(browser);
  const names = ["Reyting Alimov", "Reyting Botirov", "Reyting Valiyev"];
  const students = [];
  for (const [i, fullName] of names.entries()) {
    const s = await createStudent(request, { fullName, phone: `99890111222${i + 1}` });
    await grantFree(request, admin, fullName);
    await solveWeekly(request, s, { testId: id, png, full: i === 0 });
    students.push(s);
  }
  const me = students[1];
  if (!me) throw new Error("o'quvchi yaratilmadi");

  // Oyna ochiq: reyting yo'q (BR-W08)
  await openAsTelegram(page, { id: me.tg, first_name: "Botir" }, `/weekly/${id}`);
  await expect(page.getByText(/oyna yopilgach chiqadi/)).toBeVisible();
  await expect(page.getByTestId("ranking")).toHaveCount(0);

  expect((await close()).ok()).toBe(true);
  await page.reload();
  const card = page.getByTestId("ranking");
  await expect(card).toContainText("oʻrningiz: 2/3");
  await expect(card.getByRole("listitem")).toHaveText([
    "1Reyting A.2",
    "2Reyting Botirov (siz)1",
    "2Reyting V.1",
  ]);
  await page.screenshot({ path: "e2e/.results/miniapp-ranking.png", fullPage: true });

  await page.getByRole("link", { name: "Haftalik testlar" }).click();
  await expect(page.getByTestId("ranking")).toContainText("Umumiy reyting");
  await expect(page.getByTestId("ranking")).toContainText("Reyting Botirov (siz)");
});
