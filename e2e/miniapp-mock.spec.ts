import { expect, test } from "@playwright/test";
import { PrismaClient } from "@samarqand/db";
import { createStudent, grantFree, requestParentLink } from "./api";
import { seedMock } from "./mock-seed";
import { openAsTelegram } from "./telegram";

const API = "http://127.0.0.1:4300/api";
const at = (ms: number) => new Date(Date.now() + ms).toISOString();

test("BR-M05, BR-M06, T-114: o'quvchi mockni vaqt bilan yechadi, natija yopilgach bo'limlar bo'yicha", async ({
  page,
  request,
}) => {
  const m = await seedMock(request);
  const s = await createStudent(request, { fullName: "Mock Oquvchi", phone: "998901112251" });
  await grantFree(request, m.admin, "Mock Oquvchi");

  await openAsTelegram(page, { id: s.tg, first_name: "Oquvchi" }, "/");
  await expect(page.getByTestId("mock-home")).toContainText("2 savol · 30 daqiqa");
  await page.getByTestId("mock-home").getByRole("link", { name: "Barchasi" }).click();
  const row = page.getByTestId("mock-row").filter({ hasText: m.body.title });
  await row.click();

  await expect(page.getByText("Mock · 1/2")).toBeVisible();
  await expect(page.getByTestId("countdown")).toContainText(/Qolgan vaqt: (30:00|29:5\d)/);
  await expect(page.getByTestId("question")).toContainText("Yopiq savollar · 1.5 ball");
  await page.getByRole("radio").nth(1).click();
  await page.screenshot({ path: "e2e/.results/miniapp-mock-test.png" });
  await page.getByRole("button", { name: "Keyingi" }).click();
  await page.getByLabel("Javob", { exact: true }).fill("0,7");
  await page.getByRole("button", { name: "Yakunlash" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Topshirish" }).click();
  await expect(page.getByTestId("waiting")).toContainText("Mock topshirildi");

  // Ustoz oynani yopadi (savollar o'sha): natija ochiladi
  const closed = await request.put(`${API}/admin/mocks/${m.id}`, {
    headers: m.admin,
    data: { ...m.body, opensAt: at(-2 * 3_600_000), closesAt: at(-60_000) },
  });
  expect(closed.ok()).toBe(true);
  await page.reload();
  const score = page.getByTestId("mock-score");
  await expect(score).toContainText("25/75");
  await expect(score).toContainText("Daraja: C");
  await expect(score).toContainText("Xom ball 1.5/4.5 · taxminiy baho");
  await expect(page.getByTestId("mock-sections")).toContainText("Yopiq savollar1/11.5/1.5");
  await expect(page.getByTestId("mock-sections")).toContainText("Ochiq javob0/10/3");
  const items = page.getByTestId("result-item");
  await expect(items.nth(0)).toContainText("Toʻgʻri");
  await expect(items.nth(1)).toContainText("Ochiq javob · 0 ball");
  await page.screenshot({ path: "e2e/.results/miniapp-mock-result.png", fullPage: true });
  await page.getByRole("link", { name: "Mocklar" }).click();
  await expect(row).toContainText("Natija: 25 · C");

  // T-114: tasdiqlangan ota-ona kabinetida ham mock natijasi
  const parent = await requestParentLink(request, s.tg, "998935550311");
  const prisma = new PrismaClient();
  try {
    await prisma.parentLink.updateMany({
      where: { student: { user: { telegramId: BigInt(s.tg) } } },
      data: { status: "APPROVED" },
    });
  } finally {
    await prisma.$disconnect();
  }
  await openAsTelegram(page, { id: parent.id, first_name: "Ota" }, "/");
  const mock = page.getByTestId("child").getByTestId("child-mock");
  await expect(mock).toContainText(`${m.body.title}25/75 · Ctaxminiy`);
  await mock.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "e2e/.results/miniapp-parent-mock.png" });
});
