import { expect, test } from "@playwright/test";
import { createStudent } from "./api";
import { openAsTelegram } from "./telegram";

/**
 * T-174: Telegram deploydan oldingi index.html'ni xotiradan ochadi, unda ko'rsatilgan asosiy skript serverda yo'q.
 * Ilova oq ekranda qolmasligi kerak: sahifa bir marta qayta yuklanadi va yangi skript bilan ochiladi.
 * Dev serverda asosiy skript /src/main.tsx, production'da /assets/index-*.js: ikkalasi ham o'z domenimizdan.
 */
const MAIN = /\/(src\/main\.tsx|assets\/index-[^/]+\.js)(\?.*)?$/;

for (const broken of [
  { name: "404", status: 404, contentType: "text/plain", body: "" },
  {
    name: "HTML (eski Caddy javobi)",
    status: 200,
    contentType: "text/html",
    body: "<!doctype html><html></html>",
  },
]) {
  test(`T-174: asosiy skript ${broken.name} bo'lsa Mini App qayta yuklanib ochiladi`, async ({
    page,
    request,
  }) => {
    const s = await createStudent(request, {
      fullName: "Eski Versiya",
      phone: `99893${String(Date.now()).slice(-7)}`,
    });
    let failed = 0;
    await page.route(MAIN, (route) => {
      if (failed > 0) return route.continue();
      failed += 1;
      return route.fulfill({ status: broken.status, contentType: broken.contentType, body: broken.body });
    });

    await openAsTelegram(page, { id: s.tg, first_name: "Eski" });

    await expect(page.getByText("Assalomu alaykum, Eski!")).toBeVisible();
    expect(failed).toBe(1);
  });
}

test("T-174: skript har safar yuklanmasa sahifa cheksiz qayta yuklanmaydi", async ({ page, request }) => {
  const s = await createStudent(request, {
    fullName: "Doim Xato",
    phone: `99894${String(Date.now()).slice(-7)}`,
  });
  let loads = 0;
  page.on("load", () => (loads += 1));
  await page.route(MAIN, (route) => route.fulfill({ status: 404, body: "" }));

  await openAsTelegram(page, { id: s.tg, first_name: "Doim" });
  await page.waitForTimeout(3000);

  // Birinchi ochilish va bitta qayta yuklash: keyin to'xtaydi
  expect(loads).toBeLessThanOrEqual(2);
  await expect(page.getByText("Assalomu alaykum")).toHaveCount(0);
});
