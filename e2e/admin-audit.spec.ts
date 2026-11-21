import { expect, test } from "@playwright/test";
import { adminHeaders, adminNav, apiPost, loginAdmin } from "./api";
import { E2E_PREFIX } from "./telegram";

test("T-075: ustoz jurnalda o'zgarishlarni nomi va havolasi bilan ko'radi, bo'lim bo'yicha filtr", async ({
  page,
  request,
}) => {
  const admin = await adminHeaders(request);
  const name = `${E2E_PREFIX}Jurnal guruhi ${Date.now()}`;
  const group = await apiPost<{ id: string }>(request, "/admin/groups", admin, { name });
  const title = `${E2E_PREFIX}Jurnal fani ${Date.now()}`;
  await apiPost(request, "/admin/courses", admin, { title });

  await loginAdmin(page, request);
  await adminNav(page, "Jurnal");
  await expect(page.getByRole("heading", { name: "Jurnal" })).toBeVisible();
  const groupRow = page.getByTestId("audit-row").filter({ hasText: name });
  await expect(groupRow).toContainText("Guruh yaratdi");
  await expect(page.getByTestId("audit-row").filter({ hasText: title })).toContainText("Kurs yaratdi");
  await page.screenshot({ path: "e2e/.results/admin-audit.png", fullPage: true });

  await page.getByLabel("Jurnal boʻlimi").selectOption("people");
  await expect(page.getByTestId("audit-row").filter({ hasText: title })).toHaveCount(0);
  await groupRow.getByRole("link", { name }).click();
  await expect(page).toHaveURL(new RegExp(`/groups/${group.id}$`));
});
