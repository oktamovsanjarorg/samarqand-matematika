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
  // T-119: guruh sahifasidan "Guruhga eʼlon": guruh oldindan tanlangan
  await adminNav(page, "Guruhlar");
  await page.getByRole("link", { name: `${E2E_PREFIX}Eʼlon ${stamp}` }).click();
  await page.screenshot({ path: "e2e/.results/admin-group-broadcast-link.png" });
  await page.getByRole("link", { name: "Guruhga eʼlon" }).click();
  await expect(page.getByLabel("Guruh", { exact: true })).toHaveValue(g.id);
  await page.getByLabel("Eʼlon matni").fill("Ertaga dars soat 15:00 da");
  await page.getByLabel("Kimga").selectOption("students");
  // T-130: tugma standart holatda yoqilgan
  await expect(page.getByLabel("Xabar ostida “Ilovani ochish” tugmasi")).toBeChecked();
  await expect(page.getByTestId("broadcast-count")).toContainText("1 kishiga boradi");
  await page.getByRole("button", { name: "Yuborish" }).click();
  await expect(page.getByText("1 kishiga yuboriladi. Qaytarib boʻlmaydi.")).toBeVisible();
  await page.screenshot({ path: "e2e/.results/admin-broadcast.png", fullPage: true });
  await page.getByRole("button", { name: "Ha, yuborish" }).click();
  // e2e'da bot o'chiq (T-092): Telegram qabul qilmaydi, lekin qabul qiluvchi soni to'g'ri
  await expect(page.getByTestId("broadcast-done")).toContainText("Yuborildi: 0/1");
  await expect(page.getByLabel("Eʼlon matni")).toHaveValue("");
  // T-117: tarixda yangi e'lon birinchi turadi
  const row = page.getByTestId("broadcast-row").first();
  await expect(row).toContainText("Ertaga dars soat 15:00 da");
  await expect(row).toContainText(`Oʻquvchilarga · ${E2E_PREFIX}Eʼlon ${stamp} · 0/1 yetdi`);
  await page.screenshot({ path: "e2e/.results/admin-broadcast-history.png", fullPage: true });
});
