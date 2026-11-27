import { expect, test, type Page } from "@playwright/test";
import { createStudent } from "./api";
import { newTgId, openAsTelegram } from "./telegram";

/** Kirish javobini ushlab turadi: ilova shu vaqt ichida faqat keshdan chizilishi mumkin */
async function holdLogin(page: Page) {
  let release = () => {};
  const held = new Promise<void>((r) => (release = r));
  await page.route("**/api/auth/telegram", async (route) => {
    await held;
    await route.continue();
  });
  return release;
}

test("T-191: qayta ochilganda oxirgi holat kirishni kutmasdan chiziladi, boshqa akkauntga ko'rinmaydi", async ({
  page,
  request,
}) => {
  const s = await createStudent(request, { fullName: "Kesh Tekshiruvchi", phone: "998901112291" });
  await openAsTelegram(page, { id: s.tg, first_name: "Kesh" });
  await expect(page.getByText("Assalomu alaykum, Kesh")).toBeVisible();
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).join())).toContain(`skd-q:${s.tg}`);

  // Qayta ochish: kirish javobi ushlab turiladi, sahifa baribir keshdan chiziladi
  const release = await holdLogin(page);
  await openAsTelegram(page, { id: s.tg, first_name: "Kesh" });
  await expect(page.getByText("Assalomu alaykum, Kesh")).toBeVisible();
  await expect(page.getByRole("navigation")).toBeVisible();
  await page.screenshot({ path: "e2e/.results/miniapp-instant-cache.png" });
  // Kirish tugagach sahifa so'rovlari token bilan ketadi (401'siz)
  const statuses: number[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/api/me/")) statuses.push(r.status());
  });
  release();
  await expect.poll(() => statuses.length).toBeGreaterThan(0);
  expect(statuses.filter((x) => x === 401)).toEqual([]);

  // Shu telefonda boshqa akkaunt: oldingi o'quvchining ma'lumoti chizilmaydi
  const releaseOther = await holdLogin(page);
  await openAsTelegram(page, { id: newTgId(), first_name: "Boshqa" });
  await page.waitForTimeout(500);
  await expect(page.getByText("Assalomu alaykum, Kesh")).toHaveCount(0);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  releaseOther();
});
