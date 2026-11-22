import { expect, test, type Page } from "@playwright/test";
import { downloadText } from "./download";
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

test("T-097: kontent sahifasida savolni qidirib tahrirga o'tish", async ({ page, request }) => {
  const admin = await adminHeaders(request);
  const course = await apiPost<{ id: string }>(request, "/admin/courses", admin, {
    title: `${E2E_PREFIX}Qidiruv ${Date.now()}`,
  });
  const topic = await apiPost<{ id: string }>(request, `/admin/courses/${course.id}/topics`, admin, {
    title: "Tenglamalar",
  });
  const word = `Topiladigan${Date.now()}`;
  await apiPost(request, `/admin/topics/${topic.id}/questions`, admin, {
    type: "NUMERIC",
    text: `${word}: $3x=12$ boʻlsa, $x$ = ?`,
    answer: { value: "4" },
  });
  await loginAdmin(page, request, "content");
  await page.getByLabel("Savolni qidirish").fill(word.slice(0, -3).toLowerCase());
  const hits = page.getByTestId("question-hits").getByRole("link");
  await expect(hits).toHaveCount(1);
  await expect(hits).toContainText("Tenglamalar · Son javob");
  await expect(hits).toContainText("Nashrda emas");
  await page.screenshot({ path: "e2e/.results/admin-content-search.png", fullPage: true });
  await hits.click();
  await expect(page).toHaveURL(/\/content\/questions\/[a-z0-9]+$/);
  await expect(page.getByLabel("Savol matni")).toHaveValue(new RegExp(`^${word}`));
});

test("T-100, T-103, BR-Q04: Excel (CSV) dan savollar import: namuna, xatolar qator bilan, qoralama sifatida qo'shish", async ({
  page,
  request,
}) => {
  const admin = await adminHeaders(request);
  const course = await apiPost<{ id: string }>(request, "/admin/courses", admin, {
    title: `${E2E_PREFIX}Import ${Date.now()}`,
  });
  const topic = await apiPost<{ id: string }>(request, `/admin/courses/${course.id}/topics`, admin, {
    title: "Kasrlar",
  });
  await loginAdmin(page, request, `content/topics/${topic.id}/questions`);
  await page.getByText("Excel'dan import").click();
  const sample = await downloadText(page, page.getByRole("button", { name: "Namuna fayl" }));
  expect(sample.name).toBe("Savollar namunasi.xlsx");
  expect(sample.text).toContain("Tur;Savol;A;B;C;D;Javob;Yechim;Qiyinlik;Teglar");

  const file = (text: string) => ({ name: "savollar.csv", mimeType: "text/csv", buffer: Buffer.from(text) });
  const head = "Tur;Savol;A;B;Javob";
  await page.getByLabel("Excel yoki CSV fayl").setInputFiles(file(`${head}\nbitta;$1+1$;1;2;C\n`));
  await page.getByRole("button", { name: "Tekshirish" }).click();
  await expect(page.getByRole("alert")).toContainText("2-qator: Javob: Javob variantlar ichida yoʻq");
  await expect(page.getByRole("button", { name: "Qoʻshish" })).toBeDisabled();

  await page
    .getByLabel("Excel yoki CSV fayl")
    .setInputFiles(
      file(`${head}\nbitta;$\\frac12$ ga teng?;0,5;2;A\n;$\\frac34$ ni oʻnli kasrda yozing;;;0,75\n`),
    );
  await page.getByRole("button", { name: "Tekshirish" }).click();
  await expect(page.getByTestId("import-preview")).toContainText("2 ta savol tayyor");
  await expect(page.getByTestId("import-preview").locator(".katex").first()).toBeVisible();
  await page.screenshot({ path: "e2e/.results/admin-question-import.png", fullPage: true });
  await page.getByRole("button", { name: "2 ta savolni qoʻshish" }).click();
  await expect(page.getByRole("status")).toHaveText("2 ta savol qoralama sifatida qoʻshildi");
  const rows = page.getByTestId("question");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Qoralama");
  await expect(rows.nth(1)).toContainText("Son javob");
  // T-103: qoralamalarni bitta tugma bilan nashr qilish
  await page.getByRole("button", { name: "2 ta qoralamani nashr qilish" }).click();
  await expect(page.getByText("Qoralama", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /qoralamani nashr qilish/ })).toBeHidden();
});

test("T-154: haqiqiy Excel (.xlsx) fayldan import: 3/4 matn, manfiy va oʻnli son, boʻsh qator", async ({
  page,
  request,
}) => {
  const admin = await adminHeaders(request);
  const course = await apiPost<{ id: string }>(request, "/admin/courses", admin, {
    title: `${E2E_PREFIX}Xlsx ${Date.now()}`,
  });
  const topic = await apiPost<{ id: string }>(request, `/admin/courses/${course.id}/topics`, admin, {
    title: "Kasrlar",
  });
  await loginAdmin(page, request, `content/topics/${topic.id}/questions`);
  await page.getByText("Excel'dan import").click();
  // openpyxl bilan yasalgan fayl (Excel kabi sharedStrings, uslublar): o'z yozuvchimizdan mustaqil
  await page.getByLabel("Excel yoki CSV fayl").setInputFiles("e2e/fixtures/questions-openpyxl.xlsx");
  await page.getByRole("button", { name: "Tekshirish" }).click();
  await expect(page.getByTestId("import-preview")).toContainText("4 ta savol tayyor");
  await expect(page.getByTestId("import-preview")).toContainText("6-qator");
  await page.screenshot({ path: "e2e/.results/admin-question-import-xlsx.png", fullPage: true });
  await page.getByRole("button", { name: "4 ta savolni qoʻshish" }).click();
  await expect(page.getByRole("status")).toHaveText("4 ta savol qoralama sifatida qoʻshildi");

  const list = (await (
    await request.get(`http://127.0.0.1:4300/api/admin/topics/${topic.id}/questions`, { headers: admin })
  ).json()) as { id: string }[];
  const answers = await Promise.all(
    list.map(async (q) => {
      const res = await request.get(`http://127.0.0.1:4300/api/admin/questions/${q.id}`, { headers: admin });
      return ((await res.json()) as { answer: unknown }).answer;
    }),
  );
  expect(answers).toEqual([{ optionId: "a" }, { value: "3/4" }, { value: "-2" }, { value: "0,75" }]);

  // Buzilgan fayl: tushunarli xato, yuborilmaydi
  await page
    .getByLabel("Excel yoki CSV fayl")
    .setInputFiles({ name: "buzuq.xlsx", mimeType: "application/octet-stream", buffer: Buffer.from("emas") });
  await expect(page.getByRole("alert")).toContainText("Fayl Excel (.xlsx) emas yoki buzilgan");
});
