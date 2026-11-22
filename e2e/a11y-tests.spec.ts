import { expect, test, type Page } from "@playwright/test";
import { createStudent, grantFree } from "./api";
import { violations } from "./axe";
import { seedMock } from "./mock-seed";
import { openAsTelegram } from "./telegram";
import { seedWeekly } from "./weekly-seed";

const API = "http://127.0.0.1:4300/api";
const at = (ms: number) => new Date(Date.now() + ms).toISOString();

/** Savol ekrani → tanlangan javob → topshirish oynasi → kutish ekrani; har bosqich axe bilan */
async function solve(page: Page, label: string, check: (page: Page, step: string) => Promise<void>) {
  await expect(page.getByRole("radio").first()).toBeVisible();
  await check(page, `${label}-question`);
  await page.getByRole("radio").nth(1).click();
  await check(page, `${label}-selected`);
  await page.getByRole("button", { name: "Keyingi" }).click();
  await page.getByLabel("Javob", { exact: true }).fill("8");
  await page.getByRole("button", { name: "Yakunlash" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await check(page, `${label}-submit`);
  await page.getByRole("dialog").getByRole("button", { name: "Topshirish" }).click();
  await expect(page.getByTestId("waiting")).toBeVisible();
  await check(page, `${label}-waiting`);
}

for (const theme of ["light", "dark"] as const)
  test(`T-146: haftalik test va mock ekranlari WCAG AA (${theme === "dark" ? "tungi" : "kunduzgi"} rejim)`, async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000);
    const w = await seedWeekly(request);
    const m = await seedMock(request);
    const name = `Ekran Tekshiruvchi ${theme}`;
    const s = await createStudent(request, { fullName: name, phone: `99890${String(Date.now()).slice(-7)}` });
    await grantFree(request, w.admin, name);
    const user = { id: s.tg, first_name: "Ekran" };
    const found: string[] = [];
    const check = async (p: Page, step: string) => {
      await p.waitForLoadState("networkidle");
      await p.screenshot({ path: `e2e/.results/a11y-${theme}-${step}.png`, fullPage: true });
      found.push(...(await violations(p, step)));
    };

    await openAsTelegram(page, user, `/weekly/${w.id}`, theme);
    await solve(page, "weekly", check);
    await openAsTelegram(page, user, `/mocks/${m.id}`, theme);
    await solve(page, "mock", check);

    // Oyna yopilgach natija: to'g'ri javoblar va ball (BR-W08)
    await w.close();
    const closed = await request.put(`${API}/admin/mocks/${m.id}`, {
      headers: m.admin,
      data: { ...m.body, opensAt: at(-2 * 3_600_000), closesAt: at(-60_000) },
    });
    expect(closed.ok()).toBe(true);
    await openAsTelegram(page, user, `/weekly/${w.id}`, theme);
    await expect(page.getByTestId("result-item").first()).toBeVisible();
    await check(page, "weekly-result");
    await openAsTelegram(page, user, `/mocks/${m.id}`, theme);
    await expect(page.getByTestId("waiting")).toHaveCount(0);
    await check(page, "mock-result");
    expect(found).toEqual([]);
  });
