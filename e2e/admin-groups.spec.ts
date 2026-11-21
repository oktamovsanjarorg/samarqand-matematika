import { expect, test } from "@playwright/test";
import { adminHeaders, adminNav, apiPost, createStudent, loginAdmin } from "./api";
import { E2E_PREFIX } from "./telegram";

const API = "http://127.0.0.1:4300/api";

test("T-054: ustoz guruh tuzadi, o'quvchini qidirib qo'shadi va chiqaradi", async ({ page, request }) => {
  const name = `${E2E_PREFIX}Guruh ${Date.now()}`;
  await createStudent(request, { fullName: "Guruhli Oquvchi", phone: "998901112261" });
  await loginAdmin(page, request, "groups");
  await page.getByLabel("Guruh nomi").fill(name);
  await page.getByLabel("Jadval").fill("Du/Chor/Ju 14:00");
  await page.getByRole("button", { name: "Qoʻshish" }).click();
  const row = page.getByTestId("group").filter({ hasText: name });
  await expect(row).toContainText("Du/Chor/Ju 14:00 · 0 oʻquvchi");
  await row.click();

  await page.getByLabel("Oʻquvchini qidirish").fill("Guruhli");
  const candidate = page.getByTestId("candidate").filter({ hasText: "Guruhli Oquvchi" }).first();
  await candidate.getByRole("button", { name: "Qoʻshish" }).click();
  const members = page.getByTestId("members");
  await expect(members).toContainText("Oʻquvchilar (1)");
  await expect(members).toContainText("Guruhli Oquvchi");
  await expect(page.getByText("Topilganlar shu guruhda")).toBeVisible();
  await page.screenshot({ path: "e2e/.results/admin-group.png", fullPage: true });

  await adminNav(page, "Oʻquvchilar");
  await page.getByPlaceholder("Ism, username yoki telefon").fill("Guruhli");
  await expect(page.getByTestId("student").filter({ hasText: "Guruhli Oquvchi" }).first()).toContainText(
    name,
  );

  await adminNav(page, "Guruhlar");
  await row.click();
  await page.getByLabel("Guruhli Oquvchini guruhdan chiqarish").click();
  await expect(members).toContainText("Oʻquvchilar (0)");
});

test("T-055, BR-G02: ustoz guruh davomatini belgilaydi va saqlaydi", async ({ page, request }) => {
  const admin = await adminHeaders(request);
  // Ismda raqam bo'lmaydi: vaqt belgisini harflarga aylantiramiz
  const stamp = [...String(Date.now()).slice(-6)].map((d) => "abcdefghij"[Number(d)]).join("");
  const names = [`Ali Davomat${stamp}`, `Vali Davomat${stamp}`];
  for (const fullName of names) await createStudent(request, { fullName });
  const found = await request.get(`${API}/admin/students?filter=all&q=${stamp}`, { headers: admin });
  const ids = ((await found.json()) as { id: string }[]).map((s) => s.id);
  const g = await apiPost<{ id: string }>(request, "/admin/groups", admin, {
    name: `${E2E_PREFIX}Davomat ${stamp}`,
  });
  await apiPost(request, `/admin/groups/${g.id}/students`, admin, { userIds: ids });

  await loginAdmin(page, request, `groups/${g.id}`);
  const sheet = page.getByTestId("attendance");
  await expect(sheet.getByTestId("attendance-row")).toHaveCount(2);
  await sheet
    .getByRole("radiogroup", { name: names[0], exact: true })
    .getByRole("radio", { name: "Kelmadi", exact: true })
    .click();
  await sheet.getByRole("button", { name: "Qolganlar keldi" }).click();
  await sheet.getByRole("button", { name: "Saqlash" }).click();
  await expect(sheet).toContainText("Saqlandi");
  await page.screenshot({ path: "e2e/.results/admin-attendance.png", fullPage: true });

  await page.reload();
  const row = sheet.getByRole("radiogroup", { name: names[1], exact: true });
  await expect(row.getByRole("radio", { name: "Keldi", exact: true })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(
    sheet
      .getByRole("radiogroup", { name: names[0], exact: true })
      .getByRole("radio", { name: "Kelmadi", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
});
