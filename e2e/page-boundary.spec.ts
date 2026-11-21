import { expect, test } from "@playwright/test";
import { createStudent, loginAdmin } from "./api";
import { openAsTelegram } from "./telegram";

/** Vite dev: sahifa moduli /src/pages/X.tsx dan keladi; uni uzib "chunk yuklanmadi" holatini yasaymiz */
const pageModule = (name: string) => new RegExp(`/src/pages/${name}\\.tsx`);
const ALERT = "Sahifani ochib boʻlmadi";

test("T-135: Mini App sahifasi yuklanmasa oq ekran emas, menyu qoladi; qayta urinish ochadi", async ({
  page,
  request,
}) => {
  const s = await createStudent(request, { fullName: "Xato Sinov", phone: "998901112293" });
  await page.route(pageModule("ProfilePage"), (r) => r.abort());
  await openAsTelegram(page, { id: s.tg, first_name: "Xato" }, "/");
  const nav = page.getByRole("navigation");
  await nav.getByRole("link", { name: "Profil" }).click();
  await expect(page.getByRole("alert")).toContainText(ALERT);
  await expect(nav.getByRole("link", { name: "Asosiy" })).toBeVisible();
  await page.screenshot({ path: "e2e/.results/miniapp-page-error.png" });

  // Boshqa sahifaga o'tilsa xato holati tozalanadi
  await nav.getByRole("link", { name: "Asosiy" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);

  await page.unroute(pageModule("ProfilePage"));
  await nav.getByRole("link", { name: "Profil" }).click();
  // React.lazy xato natijani eslab qoladi: tugma sahifani to'liq qayta yuklaydi
  await expect(page.getByRole("alert")).toContainText(ALERT);
  await page.getByRole("button", { name: "Qayta urinish" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByTestId("school")).toBeVisible();
});

test("T-135: admin sahifasi yuklanmasa menyu qoladi va xabar chiqadi", async ({ page, request }) => {
  await loginAdmin(page, request);
  await page.route(pageModule("StudentsPage"), (r) => r.abort());
  await page.goto("http://127.0.0.1:5191/admin/students");
  await expect(page.getByRole("alert")).toContainText(ALERT);
  const shell = page
    .getByRole("button", { name: "Menyu", exact: true })
    .or(page.getByRole("navigation", { name: "Boʻlimlar" }));
  await expect(shell.first()).toBeVisible();
  await page.screenshot({ path: "e2e/.results/admin-page-error.png" });

  await page.unroute(pageModule("StudentsPage"));
  await page.getByRole("button", { name: "Qayta urinish" }).click();
  await expect(page.getByRole("heading", { name: "Oʻquvchilar" })).toBeVisible();
});
