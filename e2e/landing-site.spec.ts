import { expect, test } from "@playwright/test";
import { violations } from "./axe";

const SITE = "http://127.0.0.1:5192";

test("T-173: sayt sahifasi statik HTML: SEO teglari, bo'limlar, bot havolasi; WCAG AA", async ({
  page,
  request,
}) => {
  // Google skriptsiz ham hamma matnni ko'radi: kontent build paytida HTML'da
  const raw = await (await request.get(`${SITE}/`)).text();
  expect(raw).toContain("Matematikani tizimli oʻrganing");
  expect(raw).toContain('<meta name="description"');
  expect(raw).toContain('rel="canonical"');
  expect(raw).toContain('"@type":"EducationalOrganization"');

  await page.route("**/api/public/landing", (r) =>
    r.fulfill({
      json: { botLink: "https://t.me/sinov_bot", content: { topics: 0, lessons: 0, questions: 0 } },
    }),
  );
  await page.goto(`${SITE}/`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Matematikani tizimli oʻrganing");
  for (const h of ["Oʻquvchi uchun hamma narsa bir ilovada", "Qanday boshlash", "Ota-onalar uchun"])
    await expect(page.getByRole("heading", { level: 2, name: h })).toBeVisible();
  // Skript bot havolasini hamma tugmaga qo'yadi
  const bot = page.getByRole("link", { name: "Telegramʼda boshlash" });
  await expect(bot).toHaveCount(2);
  for (const a of await bot.all()) await expect(a).toHaveAttribute("href", "https://t.me/sinov_bot");

  // T-174: sahifa o'quvchi va ota-ona uchun: xodim paneli va sayt xaritasi tugmasi ko'rinmaydi
  await expect(page.locator('a[href*="admin"]')).toHaveCount(0);
  await expect(page.getByText(/ustoz va yordamchilar|boshqaruv paneli|sayt xaritasi/i)).toHaveCount(0);
  await page.getByText("Ilova oʻrnatish kerakmi?").click();
  await expect(page.getByText("Platforma Telegram ichida ochiladi")).toBeVisible();
  expect(await violations(page, "landing")).toEqual([]);
  await page.screenshot({ path: "e2e/.results/landing-site.png", fullPage: true });
});

test("T-173: API javob bermasa tugmalar ilova manzilida qoladi", async ({ page }) => {
  await page.route("**/api/public/landing", (r) => r.fulfill({ status: 503 }));
  await page.goto(`${SITE}/`);
  await expect(page.getByRole("link", { name: "Telegramʼda boshlash" }).first()).toHaveAttribute(
    "href",
    /\/$/,
  );
});

test("T-173: sitemap.xml, robots.txt va sayt xaritasi", async ({ page, request }) => {
  const xml = await (await request.get(`${SITE}/sitemap.xml`)).text();
  expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  expect(xml.match(/<loc>/g)).toHaveLength(2);
  expect(xml).toContain("/sitemap.html</loc>");
  const robots = await (await request.get(`${SITE}/robots.txt`)).text();
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);

  await page.goto(`${SITE}/sitemap.html`);
  await expect(page.getByRole("heading", { level: 1, name: "Sayt xaritasi" })).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Koʻp beriladigan savollar" }),
  ).toHaveAttribute("href", "/#savollar");
  expect(await violations(page, "sitemap")).toEqual([]);
});

test("T-173: kompyuter ekranida menyu va telefon ko'rinishi", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${SITE}/`);
  await expect(page.getByRole("navigation", { name: "Boʻlimlar" })).toBeVisible();
  await expect(page.getByText("Ketma-ket kunlar", { exact: true })).toBeVisible();
  await page.screenshot({ path: "e2e/.results/landing-site-desktop.png", fullPage: true });
});
