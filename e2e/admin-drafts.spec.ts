import { expect, test } from "@playwright/test";
import { adminHeaders, apiPost, loginAdmin } from "./api";
import { E2E_PREFIX } from "./telegram";

const ADMIN = "http://127.0.0.1:5191/admin";

test("T-153: dars matni sessiya tugasa ham yoʻqolmaydi: qayta kirilgach tiklanadi va saqlanadi", async ({
  page,
  request,
}) => {
  const h = await adminHeaders(request);
  const c = await apiPost<{ id: string }>(request, "/admin/courses", h, { title: `${E2E_PREFIX}Qoralama` });
  const t = await apiPost<{ id: string }>(request, `/admin/courses/${c.id}/topics`, h, { title: "Tenglama" });
  const l = await apiPost<{ id: string }>(request, `/admin/topics/${t.id}/lessons`, h, {
    title: "Chiziqli tenglama",
    body: "Eski matn",
  });
  await loginAdmin(page, request, `content/lessons/${l.id}`);
  const body = page.getByLabel("Konspekt");
  await body.fill("Yangi matn: $2x+3=7$");

  // Sahifa yangilandi: saqlanmagan o'zgarish tiklanadi, "Bekor qilish" serverdagi nusxaga qaytaradi
  await page.reload();
  const note = page.getByTestId("draft-restored");
  await expect(note).toContainText("Saqlanmagan oʻzgarishlar tiklandi");
  await expect(body).toHaveValue("Yangi matn: $2x+3=7$");
  await page.screenshot({ path: "e2e/.results/admin-draft-restored.png", fullPage: true });
  await note.getByRole("button", { name: "Bekor qilish" }).click();
  await expect(body).toHaveValue("Eski matn");
  await expect(note).toHaveCount(0);

  // Sessiya tugadi (401): panel kirish oynasiga o'tadi, matn esa brauzerda qoladi
  await body.fill("Ustoz kechgacha yozgan matn");
  await page.route("**/api/admin/lessons/*", (r) =>
    r.request().method() === "PATCH"
      ? r.fulfill({ status: 401, contentType: "application/json", body: '{"message":"Unauthorized"}' })
      : r.continue(),
  );
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByText("Boshqaruv paneli")).toBeVisible();
  await page.unroute("**/api/admin/lessons/*");

  // Boshqa tabda bot havolasi bilan qayta kirildi: shu tab o'zi darsga qaytadi, matn tiklangan
  const other = await page.context().newPage();
  await loginAdmin(other, request);
  await other.close();
  await expect(note).toBeVisible();
  await expect(body).toHaveValue("Ustoz kechgacha yozgan matn");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByText("Saqlandi")).toBeVisible();
  await page.reload();
  await expect(body).toHaveValue("Ustoz kechgacha yozgan matn");
  await expect(note).toHaveCount(0);
  expect(page.url()).toBe(`${ADMIN}/content/lessons/${l.id}`);
});

test("T-153: yangi savol matni sahifa yangilansa tiklanadi", async ({ page, request }) => {
  const h = await adminHeaders(request);
  const c = await apiPost<{ id: string }>(request, "/admin/courses", h, {
    title: `${E2E_PREFIX}Savol qoralama`,
  });
  const t = await apiPost<{ id: string }>(request, `/admin/courses/${c.id}/topics`, h, { title: "Kasr" });
  await loginAdmin(page, request, `content/topics/${t.id}/questions/new`);
  await page.getByLabel("Savol matni").fill("$\\frac{1}{3}+\\frac{1}{6}$ = ?");
  await page.reload();
  await expect(page.getByTestId("draft-restored")).toBeVisible();
  await expect(page.getByLabel("Savol matni")).toHaveValue("$\\frac{1}{3}+\\frac{1}{6}$ = ?");
});
