import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminHeaders, apiPost, createStudent, grantFree } from "./api";
import { E2E_PREFIX, openAsTelegram } from "./telegram";

const opts = (texts: string[]) => texts.map((text, i) => ({ id: "abcd"[i] ?? "z", text }));

async function seedTopic(request: APIRequestContext) {
  const admin = await adminHeaders(request);
  const title = `${E2E_PREFIX}Test ${Date.now()}`;
  const course = await apiPost<{ id: string }>(request, "/admin/courses", admin, {
    title,
    isPublished: true,
  });
  const topic = await apiPost<{ id: string }>(request, `/admin/courses/${course.id}/topics`, admin, {
    title: "Kasrlar",
  });
  const add = (q: object) =>
    apiPost(request, `/admin/topics/${topic.id}/questions`, admin, { isPublished: true, ...q });
  await add({
    type: "SINGLE",
    text: "$\\frac{1}{2} + \\frac{1}{4}$ = ?",
    options: opts(["$\\frac{3}{4}$", "$\\frac{2}{6}$", "1"]),
    answer: { optionId: "a" },
    solution: "Umumiy maxraj 4: $\\frac{2}{4} + \\frac{1}{4} = \\frac{3}{4}$",
  });
  await add({ type: "NUMERIC", text: "$0{,}5 + 0{,}25$ = ?", answer: { value: "3/4" } });
  await add({
    type: "MATCHING",
    text: "Moslang",
    left: opts(["1/2", "1/4"]),
    right: [
      { id: "1", text: "0,5" },
      { id: "2", text: "0,25" },
    ],
    answer: { pairs: { a: "1", b: "2" } },
  });
  await add({ type: "WRITTEN", text: "Yechimni tushuntiring" });
  await add({
    type: "SINGLE",
    text: "Qoralama savol",
    options: opts(["x", "y"]),
    answer: { optionId: "a" },
    isPublished: false,
  });
  return { admin, title };
}

test("BR-Q01, BR-Q03, BR-P03, T-079: o'quvchi mavzu testini yechadi va natijani ko'radi", async ({
  page,
  request,
}) => {
  const { admin, title } = await seedTopic(request);
  const s = await createStudent(request, { fullName: "Test Yechuvchi", phone: "998901112203" });
  await grantFree(request, admin, "Test Yechuvchi");

  await openAsTelegram(page, { id: s.tg, first_name: "Oquvchi" }, "/lessons");
  const started = page.waitForResponse(
    (r) => r.url().includes("/attempts") && r.request().method() === "POST",
  );
  await page
    .getByTestId("course")
    .filter({ hasText: title })
    .getByRole("link", { name: /Mavzu testi/ })
    .click();
  const body = await (await started).text();
  expect(body).not.toContain("solution");
  expect(body).not.toContain("optionId");
  await expect(page.getByText("Mavzu testi · 1/4")).toBeVisible();

  await page.getByRole("radio").first().click();
  await expect(page.getByRole("radio").first()).toHaveAttribute("aria-checked", "true");
  await page.screenshot({ path: "e2e/.results/miniapp-test.png", fullPage: true });
  await page.getByRole("button", { name: "Keyingi" }).click();
  await page.getByLabel("Javob", { exact: true }).fill("0,5");
  await page.getByRole("button", { name: "Keyingi" }).click();
  await page.getByRole("button", { name: "A → 1" }).click();
  await page.getByRole("button", { name: "B → 2" }).click();

  // Qayta ochilganda javoblar saqlanib qoladi
  await page.reload();
  await expect(page.getByRole("button", { name: "1-savol, javob berilgan" })).toBeVisible();
  await page.getByRole("button", { name: "2-savol, javob berilgan" }).click();
  await expect(page.getByLabel("Javob", { exact: true })).toHaveValue("0,5");

  // T-024: Asosiy ekranda tugallanmagan test
  await page.getByRole("navigation").last().getByRole("link", { name: "Asosiy" }).click();
  await expect(page.getByTestId("continue")).toContainText("Kasrlar · 3/4 javob");
  await page.getByTestId("continue").click();

  await page.getByRole("button", { name: "4-savol" }).click();
  await page.getByRole("button", { name: "Yakunlash" }).click();
  await expect(page.getByText("Javob berilmagan savollar: 1 ta.")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Topshirish" }).click();

  await expect(page.getByTestId("score")).toContainText("2/3");
  await expect(page.getByTestId("score")).toContainText("Ustoz tekshiradi: 1 ta savol");
  const items = page.getByTestId("result-item");
  await expect(items.nth(1)).toContainText("Xato");
  await expect(items.nth(1)).toContainText("Toʻgʻri javob: 3/4");
  await items.nth(0).getByText("Yechim").click();
  await expect(items.nth(0).getByText(/Umumiy maxraj/)).toBeVisible();
  await page.screenshot({ path: "e2e/.results/miniapp-test-result.png", fullPage: true });
  await checkStats(page, title);
});

/** T-024: natija Asosiy va Profil ekranlarida ko'rinadi */
async function checkStats(page: Page, courseTitle: string) {
  const nav = page.getByRole("navigation").last();
  await nav.getByRole("link", { name: "Asosiy" }).click();
  await expect(page.getByTestId("recent")).toContainText("Kasrlar");
  await expect(page.getByTestId("recent")).toContainText("2/3");
  await expect(page.getByTestId("recent")).toContainText(/\d{2}\.\d{2}/);
  await expect(page.getByTestId("continue")).toHaveCount(0);
  await expect(page.getByTestId("access")).toHaveCount(0);
  await page.screenshot({ path: "e2e/.results/miniapp-home.png" });
  await nav.getByRole("link", { name: "Profil" }).click();
  await expect(page.getByTestId("tiles")).toContainText("1");
  await expect(page.getByTestId("tiles")).toContainText("67%");
  await expect(page.getByTestId("topics")).toContainText("Kasrlar");
  await page.screenshot({ path: "e2e/.results/miniapp-profile.png" });
  // T-079: xato ishlangan son savol "Xatolarim"da, to'g'ri javobi bilan
  await page.getByRole("link", { name: /Xatolarim/ }).click();
  const mistakes = page.getByTestId("mistake-topic").filter({ hasText: "Kasrlar" });
  await expect(mistakes.getByTestId("result-item")).toHaveCount(1);
  await expect(mistakes).toContainText("Toʻgʻri javob: 3/4");
  await expect(mistakes).toContainText("1 marta xato");
  await page.screenshot({ path: "e2e/.results/miniapp-mistakes.png", fullPage: true });
  // T-067: Darslar ro'yxatida mavzuning eng yaxshi natijasi
  await nav.getByRole("link", { name: "Darslar" }).click();
  const topic = page.getByTestId("course").filter({ hasText: courseTitle }).getByTestId("topic");
  await expect(topic.getByTestId("best")).toHaveText("67%");
  await expect(topic).toContainText("1 marta ishlangan");
  await topic.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "e2e/.results/miniapp-lessons-progress.png" });
}

test("BR-A04: to'liq kirishsiz o'quvchiga mavzu testi yopiq", async ({ page, request }) => {
  const { title } = await seedTopic(request);
  const s = await createStudent(request, { fullName: "Yopiq Oquvchi", phone: "998901112204" });
  await openAsTelegram(page, { id: s.tg, first_name: "Oquvchi" }, "/lessons");
  await page
    .getByTestId("course")
    .filter({ hasText: title })
    .getByRole("link", { name: /Mavzu testi/ })
    .click();
  await expect(page.getByText("Mavzu testi obuna bilan ochiladi")).toBeVisible();
});
