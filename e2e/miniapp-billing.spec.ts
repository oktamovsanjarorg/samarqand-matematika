import { expect, test } from "@playwright/test";
import { adminHeaders, apiPost, createStudent } from "./api";
import { E2E_PREFIX, openAsTelegram } from "./telegram";

const API = "http://127.0.0.1:4300/api";

test("BR-B01..B03: o'quvchi tarif tanlaydi, chek yuboradi, tasdiqdan keyin obuna faol", async ({
  page,
  request,
  browser,
}) => {
  const admin = await adminHeaders(request);
  const plan = `${E2E_PREFIX}Oylik ${Date.now()}`;
  const { id: planId } = await apiPost<{ id: string }>(request, "/admin/plans", admin, {
    name: plan,
    priceUzs: 150_000,
    durationDays: 30,
  });
  await request.put(`${API}/admin/billing-card`, {
    headers: admin,
    data: { number: "8600000000000000", holder: `${E2E_PREFIX}Ustoz` },
  });

  const draw = await browser.newPage({ viewport: { width: 360, height: 480 } });
  await draw.setContent('<div style="font:24px sans-serif;padding:24px">Chek · 150 000 soʻm</div>');
  const png = await draw.screenshot();
  await draw.close();

  const s = await createStudent(request, { fullName: "Obuna Oluvchi", phone: "998901112205" });
  await openAsTelegram(page, { id: s.tg, first_name: "Oquvchi" });
  await page.getByRole("link", { name: "Obunani toʻlash" }).click();
  await expect(page.getByRole("heading", { name: "Obuna" })).toBeVisible();
  await page.getByRole("radio", { name: new RegExp(plan) }).click();
  await expect(page.getByTestId("card")).toContainText("8600 0000 0000 0000");
  await page.getByLabel("Chek rasmi").setInputFiles({ name: "chek.png", mimeType: "image/png", buffer: png });
  await expect(page.getByRole("img", { name: "Tanlangan chek" })).toBeVisible();
  await page.getByPlaceholder(/Izoh/).fill("Otamning kartasidan");
  await page.screenshot({ path: "e2e/.results/miniapp-billing.png", fullPage: true });
  await page.getByRole("button", { name: "Chekni yuborish" }).click();

  await expect(page.getByTestId("pending")).toBeVisible();
  await expect(page.getByTestId("history")).toContainText("Tekshirilmoqda");
  await page.getByRole("button", { name: "Chekni bekor qilish" }).click();
  await expect(page.getByTestId("history")).toHaveCount(0);

  await page.getByRole("radio", { name: new RegExp(plan) }).click();
  await page.getByLabel("Chek rasmi").setInputFiles({ name: "chek.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Chekni yuborish" }).click();
  await expect(page.getByTestId("pending")).toBeVisible();

  const list = (await (await request.get(`${API}/admin/payments`, { headers: admin })).json()) as {
    id: string;
    student: { name: string };
  }[];
  const mine = list.find((p) => p.student.name === "Obuna Oluvchi");
  expect((await request.post(`${API}/admin/payments/${mine?.id}/approve`, { headers: admin })).ok()).toBe(
    true,
  );

  await page.reload();
  await expect(page.getByTestId("active")).toContainText("Obuna faol");
  await expect(page.getByTestId("history")).toContainText("Tasdiqlandi");
  await page.screenshot({ path: "e2e/.results/miniapp-billing-active.png", fullPage: true });
  expect(planId).toBeTruthy();
});
