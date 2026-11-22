import { expect, test } from "@playwright/test";
import { createStudent, loginAdmin } from "./api";
import { openAsTelegram } from "./telegram";

const UNAVAILABLE = "Server yangilanmoqda. Bir daqiqadan soʻng qayta urinib koʻring.";
const OFFLINE = "Internetga ulanib boʻlmadi. Qayta urinib koʻring.";

test("T-151: admin: deploy paytidagi tanasiz 502 va uzilgan internet oʻzbekcha xabar bilan", async ({
  page,
  request,
}) => {
  await loginAdmin(page, request);
  await page.route("**/api/admin/dashboard", (r) => r.fulfill({ status: 502, body: "" }));
  await page.reload();
  await expect(page.getByText(UNAVAILABLE)).toBeVisible();
  await page.screenshot({ path: "e2e/.results/admin-unavailable.png" });

  await page.unroute("**/api/admin/dashboard");
  await page.route("**/api/admin/dashboard", (r) => r.abort("internetdisconnected"));
  await page.reload();
  await expect(page.getByText(OFFLINE)).toBeVisible();
  await expect(page.getByText("Failed to fetch")).toHaveCount(0);
});

test("T-151: Mini App: tanasiz 502 da 'server yangilanmoqda', qayta urinish ochadi", async ({
  page,
  request,
}) => {
  const s = await createStudent(request, { fullName: "Tarmoq Xabar", phone: "998901112248" });
  await page.route("**/api/weekly", (r) => r.fulfill({ status: 502, body: "" }));
  await openAsTelegram(page, { id: s.tg, first_name: "Oquvchi" }, "/weekly");
  await expect(page.getByText(UNAVAILABLE)).toBeVisible();
  await page.screenshot({ path: "e2e/.results/miniapp-unavailable.png" });
  await page.unroute("**/api/weekly");
  await page.getByRole("button", { name: /Qayta urinish/ }).click();
  await expect(page.getByText(UNAVAILABLE)).toHaveCount(0);
});
