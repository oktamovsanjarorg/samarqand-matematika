import { expect, test, type Page } from "@playwright/test";
import { createStudent, grantFree, loginAdmin } from "./api";
import { openAsTelegram } from "./telegram";
import { notebookPng, seedWeekly, solveWeekly } from "./weekly-seed";

/** Telegram ilovasi fonga o'tib qaytgandek: visibilitychange hidden → visible */
async function leaveAndReturn(page: Page, ms: number) {
  const set = (state: string) =>
    page.evaluate((s) => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => s });
      document.dispatchEvent(new Event("visibilitychange"));
    }, state);
  await set("hidden");
  await page.waitForTimeout(ms);
  await set("visible");
}

test("T-193, BR-W05, BR-W11: testda ilovadan chiqish ustoz navbatida signal, o'quvchiga ko'rinmaydi", async ({
  page,
  request,
  browser,
}) => {
  const w = await seedWeekly(request);
  const a = await createStudent(request, { fullName: "Chiqish Tekshiruvchi", phone: "998901112293" });
  await grantFree(request, w.admin, "Chiqish Tekshiruvchi");
  await openAsTelegram(page, { id: a.tg, first_name: "Chiqish" }, `/weekly/${w.id}`);
  await expect(page.getByText("Haftalik test · 1/2")).toBeVisible();

  const sent = page.waitForRequest((r) => r.url().endsWith("/away") && r.method() === "POST");
  await leaveAndReturn(page, 1200);
  const req = await sent;
  expect((req.postDataJSON() as { ms: number }).ms).toBeGreaterThanOrEqual(1000);
  await expect(page.getByText(/chiq/i)).toHaveCount(0);

  // Yana 6 marta (API orqali, tezroq), keyin topshiradi
  for (let i = 0; i < 6; i++)
    expect((await request.post(req.url(), { headers: a.headers, data: { ms: 2000 } })).status()).toBe(204);
  await solveWeekly(request, a, { testId: w.id, png: await notebookPng(browser) });

  await loginAdmin(page, request, `weekly/${w.id}/review`);
  const first = page.getByTestId("review-item").first();
  await expect(first).toContainText("Chiqish Tekshiruvchi");
  await expect(first).toContainText("Ilovadan chiqqan: 7 marta");
  await page.screenshot({ path: "e2e/.results/admin-review-away.png" });
  expect((await w.close()).ok()).toBe(true);
});
