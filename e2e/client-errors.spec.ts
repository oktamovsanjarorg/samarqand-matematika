import { expect, test, type Page } from "@playwright/test";
import { createStudent, loginAdmin } from "./api";
import { openAsTelegram } from "./telegram";

/** Sahifada render'dan tashqari xato chiqaradi va serverga ketgan xabarni qaytaradi */
async function throwAndCatch(page: Page, message: string) {
  const sent = page.waitForRequest((r) => r.url().endsWith("/api/client-errors") && r.method() === "POST");
  await page.evaluate((m) => {
    setTimeout(() => {
      throw new Error(m);
    });
  }, message);
  return (await sent).postDataJSON() as Record<string, string>;
}

test("T-190: Mini App xatosi serverga ketadi (sahifa yo'li, initData'siz), tarmoq xatosi ketmaydi", async ({
  page,
  request,
}) => {
  const s = await createStudent(request, { fullName: "Xato Tekshiruvchi", phone: "998901112290" });
  await openAsTelegram(page, { id: s.tg, first_name: "Xato" });
  await expect(page.getByRole("navigation")).toBeVisible();
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/api/client-errors")) calls.push(r.postData() ?? "");
  });
  await page.evaluate(() => {
    void Promise.reject(new TypeError("Failed to fetch"));
  });
  const body = await throwAndCatch(page, "T-190 sinov xatosi");
  expect(body).toMatchObject({ app: "miniapp", message: "Error: T-190 sinov xatosi", page: "/" });
  expect(JSON.stringify(body)).not.toContain("hash=");
  expect(calls.filter((c) => c.includes("Failed to fetch"))).toEqual([]);
});

test("T-190: admin panel xatosi serverga ketadi", async ({ page, request }) => {
  await loginAdmin(page, request);
  const body = await throwAndCatch(page, "T-190 admin xatosi");
  expect(body).toMatchObject({ app: "admin", message: "Error: T-190 admin xatosi" });
});
