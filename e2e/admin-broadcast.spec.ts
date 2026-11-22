import { expect, test } from "@playwright/test";
import { adminHeaders, adminNav, apiPost, createStudent, loginAdmin } from "./api";
import { E2E_PREFIX } from "./telegram";

const API = "http://127.0.0.1:4300/api";

test("T-116: ustoz guruhga eʼlon yozadi, kimga borishini koʻradi va tasdiqlab yuboradi", async ({
  page,
  request,
}) => {
  const admin = await adminHeaders(request);
  // Ismda raqam bo'lmaydi: vaqt belgisini harflarga aylantiramiz
  const stamp = [...String(Date.now()).slice(-6)].map((d) => "abcdefghij"[Number(d)]).join("");
  await createStudent(request, { fullName: `Elon Oquvchi${stamp}` });
  const found = await request.get(`${API}/admin/students?filter=all&q=${stamp}`, { headers: admin });
  const [s] = (await found.json()) as { id: string }[];
  await apiPost(request, `/admin/students/${s?.id}/accept`, admin, {});
  const g = await apiPost<{ id: string }>(request, "/admin/groups", admin, {
    name: `${E2E_PREFIX}Eʼlon ${stamp}`,
  });
  await apiPost(request, `/admin/groups/${g.id}/students`, admin, { userIds: [s?.id] });

  await loginAdmin(page, request);
  await adminNav(page, "Eʼlon yuborish");
  await page.getByLabel("Eʼlon matni").fill("Ertaga dars soat 15:00 da");
  await page.getByLabel("Kimga").selectOption("students");
  await page.getByLabel("Guruh").selectOption(g.id);
  await expect(page.getByTestId("broadcast-count")).toContainText("1 kishiga boradi");
  await page.getByRole("button", { name: "Yuborish" }).click();
  await expect(page.getByText("1 kishiga yuboriladi. Qaytarib boʻlmaydi.")).toBeVisible();
  await page.screenshot({ path: "e2e/.results/admin-broadcast.png", fullPage: true });
  await page.getByRole("button", { name: "Ha, yuborish" }).click();
  // e2e'da bot o'chiq (T-092): Telegram qabul qilmaydi, lekin qabul qiluvchi soni to'g'ri
  await expect(page.getByTestId("broadcast-done")).toContainText("Yuborildi: 0/1");
  await expect(page.getByLabel("Eʼlon matni")).toHaveValue("");
});
