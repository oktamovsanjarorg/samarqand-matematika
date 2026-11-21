import { expect, test } from "@playwright/test";
import { loginAdmin } from "./api";
import { violations } from "./axe";

const PAGES = [
  "",
  "content",
  "students",
  "parents",
  "payments",
  "weekly",
  "weekly/new",
  "mocks",
  "mocks/new",
  "groups",
  "offline",
  "tutor",
  "settings",
  "audit",
  "trash",
];

test("T-072: admin bo'limlari WCAG AA", async ({ page, request }) => {
  test.setTimeout(180_000);
  await loginAdmin(page, request);
  const found: string[] = [];
  for (const path of PAGES) {
    await page.goto(`http://127.0.0.1:5191/admin/${path}`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `e2e/.results/a11y-admin-${path.replace("/", "-") || "home"}.png`,
      fullPage: true,
    });
    found.push(...(await violations(page, `/${path}`)));
  }
  expect(found).toEqual([]);
});
