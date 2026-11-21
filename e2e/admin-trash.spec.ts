import { expect, test } from "@playwright/test";
import { adminHeaders, apiPost, loginAdmin } from "./api";
import { E2E_PREFIX } from "./telegram";

test("T-099, BR-C06: o'chirilgan dars axlat qutisidan konspekti bilan tiklanadi", async ({
  page,
  request,
}) => {
  const admin = await adminHeaders(request);
  const stamp = Date.now();
  const course = `${E2E_PREFIX}Axlat ${stamp}`;
  const c = await apiPost<{ id: string }>(request, "/admin/courses", admin, { title: course });
  const t = await apiPost<{ id: string }>(request, `/admin/courses/${c.id}/topics`, admin, {
    title: "Kasrlar",
  });
  const lesson = `Tasodifan oʻchgan dars ${stamp}`;
  const l = await apiPost<{ id: string }>(request, `/admin/topics/${t.id}/lessons`, admin, { title: lesson });
  await request.patch(`http://127.0.0.1:4300/api/admin/lessons/${l.id}`, {
    headers: admin,
    data: { body: "Muhim konspekt" },
  });

  await loginAdmin(page, request, "content");
  await page.getByRole("button", { name: `${lesson}: oʻchirish` }).click();
  await page.getByRole("button", { name: "Oʻchirilsinmi?" }).click();
  await expect(page.getByText(lesson)).toBeHidden();

  await page.goto("http://127.0.0.1:5191/admin/trash");
  const row = page.getByTestId("trash-row").filter({ hasText: lesson });
  await expect(row).toContainText("Dars");
  await expect(row).toContainText(`${course} · Kasrlar`);
  await expect(row).toContainText("30 kundan keyin butunlay oʻchadi");
  await page.screenshot({ path: "e2e/.results/admin-trash.png", fullPage: true });
  await row.getByRole("button", { name: "Tiklash" }).click();
  await expect(row).toBeHidden();

  await page.goto("http://127.0.0.1:5191/admin/content");
  await page.getByRole("link", { name: lesson }).click();
  await expect(page.getByLabel("Konspekt")).toHaveValue("Muhim konspekt");
});
