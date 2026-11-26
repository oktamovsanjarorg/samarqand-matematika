import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { adminHeaders, adminNav, createStudent, loginAdmin } from "./api";
import { E2E_PREFIX } from "./telegram";

const API = "http://127.0.0.1:4300/api";

/** Haqiqiy PNG chek: brauzerda chizilib skrinshot qilinadi */
async function receiptPng(browser: Browser, text: string) {
  const page = await browser.newPage({ viewport: { width: 360, height: 480 } });
  await page.setContent(
    `<div style="font:24px sans-serif;padding:24px">Chek<br/>${text}<br/>150 000 soʻm</div>`,
  );
  const png = await page.screenshot();
  await page.close();
  return png;
}

async function sendReceipt(request: APIRequestContext, browser: Browser, planId: string, name: string) {
  const s = await createStudent(request, {
    fullName: name,
    phone: `99890${Math.floor(1_000_000 + Math.random() * 8_999_999)}`,
  });
  const res = await request.post(`${API}/billing/payments?planId=${planId}&note=Otamning%20kartasidan`, {
    headers: { ...s.headers, "content-type": "image/png" },
    data: await receiptPng(browser, name),
  });
  expect(res.status()).toBe(201);
}

test("BR-B01, BR-B03..B05, T-109, T-111: ustoz tarif va kartani sozlaydi, chekni tasdiqlaydi va rad etadi", async ({
  page,
  request,
  browser,
}) => {
  const plan = `${E2E_PREFIX}Oylik ${Date.now()}`;
  await loginAdmin(page, request, "settings");
  await page.getByLabel("Tarif nomi").fill(plan);
  await page.getByLabel("Narx").fill("150000");
  await page.getByRole("button", { name: "Qoʻshish" }).click();
  await expect(page.getByTestId("plan").filter({ hasText: plan })).toContainText("150 000 soʻm · 30 kun");
  await page.getByLabel("Karta raqami").fill("8600 0000 0000 0000");
  await page.getByLabel("Karta egasi").fill(`${E2E_PREFIX}Ustoz`);
  await page.getByRole("button", { name: "Kartani saqlash" }).click();
  await expect(page.getByText("Saqlandi")).toBeVisible();
  await page.screenshot({ path: "e2e/.results/admin-settings.png", fullPage: true });

  const plans = (await (
    await request.get(`${API}/admin/plans`, { headers: await adminHeaders(request) })
  ).json()) as { id: string; name: string }[];
  const planId = plans.find((p) => p.name === plan)?.id ?? "";
  await sendReceipt(request, browser, planId, "Tolov Birinchi");
  await sendReceipt(request, browser, planId, "Tolov Ikkinchi");

  await adminNav(page, "Toʻlovlar");
  const first = page.getByTestId("payment").filter({ hasText: "Tolov Birinchi" });
  await expect(first).toContainText("Izoh: Otamning kartasidan");
  // T-128: tasdiqlansa obuna qaysi sanagacha bo'lishi (yangi o'quvchi: bugundan +tarif kunlari)
  await expect(first.getByTestId("extends-to")).toContainText(/Tasdiqlansa obuna \d{2}\.\d{2}\.\d{4} gacha/);
  const img = first.getByRole("img", { name: "Toʻlov cheki" });
  await expect(img).toBeVisible();
  expect(await img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: "e2e/.results/admin-payments.png", fullPage: true });
  await first.getByRole("button", { name: "Tasdiqlash" }).click();
  await expect(first).toHaveCount(0);
  // T-109: tasdiqlangan to'lov oylik tushumda tarif bo'yicha ko'rinadi, Excel'ga yuklanadi
  const income = page.getByLabel("Oylik tushum");
  await expect(income.getByRole("listitem").filter({ hasText: plan })).toContainText("1 ta · 150 000 soʻm");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "e2e/.results/admin-income.png" });
  const download = page.waitForEvent("download");
  await income.getByRole("button", { name: "Excelʼga yuklab olish" }).click();
  expect((await download).suggestedFilename()).toMatch(/^Tushum \d{4}-\d{2}\.xlsx$/);

  const second = page.getByTestId("payment").filter({ hasText: "Tolov Ikkinchi" });
  await second.getByRole("button", { name: "Rad etish" }).click();
  await second.getByLabel("Rad etish sababi").fill("Summa toʻliq emas");
  await second.getByRole("button", { name: "Rad etishni tasdiqlash" }).click();
  await expect(second).toHaveCount(0);

  await page.getByRole("tab", { name: "Tasdiqlangan" }).click();
  await expect(page.getByTestId("payment").filter({ hasText: "Tolov Birinchi" })).toContainText(
    /Obuna: .* gacha/,
  );
  await page.getByRole("tab", { name: "Rad etilgan" }).click();
  await expect(page.getByTestId("payment").filter({ hasText: "Tolov Ikkinchi" })).toContainText(
    "Sabab: Summa toʻliq emas",
  );

  await checkCardPayments(page, plan);
});

/** T-111: o'quvchi kartasida cheklar tarixi, rad etish sababi bilan */
async function checkCardPayments(page: Page, plan: string) {
  await adminNav(page, "Oʻquvchilar");
  await page.getByRole("tab", { name: "Hammasi" }).click();
  await page.getByPlaceholder("Ism, username yoki telefon").fill("Tolov Ikkinchi");
  await page.getByTestId("student").first().getByRole("link", { name: "Tolov Ikkinchi" }).click();
  await page.getByRole("tab", { name: "Toʻlov" }).click();
  const history = page.getByTestId("card-payments");
  await expect(history).toContainText(`${plan} · 150 000 soʻm`);
  await expect(history).toContainText("Rad etilgan");
  await expect(history).toContainText("Sabab: Summa toʻliq emas");
  await history.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "e2e/.results/admin-card-payments.png" });
}
