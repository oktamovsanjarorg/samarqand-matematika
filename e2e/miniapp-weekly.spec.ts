import { expect, test, type APIRequestContext } from "@playwright/test";
import { adminHeaders, apiPost, createStudent, grantFree } from "./api";
import { E2E_PREFIX, openAsTelegram } from "./telegram";

const API = "http://127.0.0.1:4300/api";
const HOUR = 3_600_000;
const at = (ms: number) => new Date(Date.now() + ms).toISOString();

/** Ikki savolli, hozir ochiq haftalik test (API orqali) */
async function seedWeekly(request: APIRequestContext) {
  const admin = await adminHeaders(request);
  const c = await apiPost<{ id: string }>(request, "/admin/courses", admin, {
    title: `${E2E_PREFIX}Haftalik bank ${Date.now()}`,
  });
  const t = await apiPost<{ id: string }>(request, `/admin/courses/${c.id}/topics`, admin, {
    title: "Aralash",
  });
  const add = async (q: object) =>
    (await apiPost<{ id: string }>(request, `/admin/topics/${t.id}/questions`, admin, q)).id;
  const options = [
    { id: "a", text: "3" },
    { id: "b", text: "4" },
  ];
  const questionIds = [
    await add({
      type: "SINGLE",
      text: "2+2 = ?",
      options,
      answer: { optionId: "b" },
      solution: "2 ta va yana 2 ta: 4",
    }),
    await add({ type: "NUMERIC", text: "$\\frac{1}{2}+\\frac{1}{4}$ = ?", answer: { value: "3/4" } }),
  ];
  const title = `${E2E_PREFIX}Hafta ${Date.now()}`;
  const body = { title, opensAt: at(-HOUR), closesAt: at(50 * HOUR), questionIds, isPublished: true };
  const w = await apiPost<{ id: string }>(request, "/admin/weekly", admin, body);
  // Oynani yopish: ustoz yopilish vaqtini o'tmishga suradi (savollar o'sha)
  const close = async () => {
    const res = await request.put(`${API}/admin/weekly/${w.id}`, {
      headers: admin,
      data: { ...body, opensAt: at(-2 * HOUR), closesAt: at(-60_000) },
    });
    expect(res.ok()).toBe(true);
  };
  return { admin, title, close };
}

test("BR-W02, BR-W08: o'quvchi haftalik testni bir marta topshiradi, natija oyna yopilgach chiqadi", async ({
  page,
  request,
}) => {
  const { admin, title, close } = await seedWeekly(request);
  const s = await createStudent(request, { fullName: "Haftalik Oquvchi", phone: "998901112207" });
  await grantFree(request, admin, "Haftalik Oquvchi");

  await openAsTelegram(page, { id: s.tg, first_name: "Oquvchi" }, "/");
  await expect(page.getByTestId("weekly-home")).toBeVisible();
  await page.getByTestId("weekly-home").getByRole("link", { name: "Barchasi" }).click();
  const row = page.getByTestId("weekly-row").filter({ hasText: title });
  await expect(row).toContainText(/Ochiq · 2 kun \d+ soat qoldi/);
  await row.click();

  await expect(page.getByText("Haftalik test · 1/2")).toBeVisible();
  await expect(page.getByTestId("deadline")).toContainText("bir marta topshiriladi");
  await page.getByRole("radio").nth(1).click();
  await page.screenshot({ path: "e2e/.results/miniapp-weekly-test.png" });
  await page.getByRole("button", { name: "Keyingi" }).click();
  await page.getByLabel("Javob", { exact: true }).fill("1/2");
  await page.getByRole("button", { name: "Yakunlash" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Topshirish" }).click();

  // Topshirildi: oyna ochiq ekan, ball ham, to'g'ri javob ham ko'rinmaydi
  await expect(page.getByTestId("waiting")).toContainText("Test topshirildi");
  await expect(page.getByText("2/2")).toHaveCount(0);
  await page.screenshot({ path: "e2e/.results/miniapp-weekly-waiting.png" });
  await page.reload();
  await expect(page.getByTestId("waiting")).toBeVisible();
  await page.getByRole("link", { name: "Haftalik testlar" }).click();
  await expect(row).toContainText("Topshirildi · natija");

  await close();
  await page.reload();
  await expect(row).toContainText("Natija: 1/2");
  await row.click();
  await expect(page.getByTestId("score")).toContainText("1/2");
  const items = page.getByTestId("result-item");
  await expect(items.nth(0)).toContainText("Toʻgʻri");
  await expect(items.nth(1)).toContainText("Toʻgʻri javob: 3/4");
  await items.nth(0).getByText("Yechim").click();
  await page.screenshot({ path: "e2e/.results/miniapp-weekly-result.png", fullPage: true });
});

test("BR-W09: to'liq kirishsiz o'quvchiga haftalik test yopiq", async ({ page, request }) => {
  const { title } = await seedWeekly(request);
  const s = await createStudent(request, { fullName: "Yopiq Haftalik", phone: "998901112208" });
  await openAsTelegram(page, { id: s.tg, first_name: "Oquvchi" }, "/weekly");
  await page.getByTestId("weekly-row").filter({ hasText: title }).click();
  await expect(page.getByText("Haftalik test obuna bilan ochiladi")).toBeVisible();
});
