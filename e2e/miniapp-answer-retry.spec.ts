import { expect, test } from "@playwright/test";
import { createStudent, grantFree } from "./api";
import { openAsTelegram } from "./telegram";
import { seedWeekly } from "./weekly-seed";

const ANSWERS = "**/api/weekly-attempts/*/answers/*";

test("T-150: internet uzilsa javob yoʻqolmaydi: qaytganda oʻzi saqlanadi, saqlanmaguncha test topshirilmaydi", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const w = await seedWeekly(request);
  try {
    const s = await createStudent(request, { fullName: "Tarmoq Oquvchi", phone: "998901112249" });
    await grantFree(request, w.admin, "Tarmoq Oquvchi");
    // Serverga yetgan so'rovlar tartibi: javoblar topshirishdan oldin bo'lishi kerak
    const log: string[] = [];
    page.on("response", (r) => {
      const m = /\/(answers\/(\w+)|submit)$/.exec(new URL(r.url()).pathname);
      if (m && r.ok()) log.push(m[2] ?? "submit");
    });
    await openAsTelegram(page, { id: s.tg, first_name: "Oquvchi" }, `/weekly/${w.id}`);
    await expect(page.getByText("Haftalik test · 1/2")).toBeVisible();

    // 1) Internet yo'q: tanlov ekranda turadi, ogohlantirish chiqadi; internet qaytgach o'zi saqlanadi
    await page.context().setOffline(true);
    await page.getByRole("radio").nth(1).click();
    const alert = page.getByRole("alert").filter({ hasText: "Javob saqlanmadi" });
    await expect(alert).toBeVisible();
    await page.screenshot({ path: "e2e/.results/miniapp-answer-offline.png" });
    await page.context().setOffline(false);
    await expect(alert).toBeHidden({ timeout: 15_000 });
    expect(log).toEqual([w.questionIds[0]]);
    await page.reload();
    await expect(page.getByRole("radio").nth(1)).toHaveAttribute("aria-checked", "true");

    // 2) Javob serverga yetmasa topshirish to'xtaydi va o'zbekcha sabab ko'rinadi
    await page.route(ANSWERS, (r) => r.abort("internetdisconnected"));
    await page.getByRole("button", { name: "Keyingi" }).click();
    await page.getByLabel("Javob", { exact: true }).fill("8");
    await page.getByRole("button", { name: "Yakunlash" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Topshirish" }).click();
    await expect(dialog).toContainText("Internetga ulanib boʻlmadi. Qayta urinib koʻring.");
    await page.screenshot({ path: "e2e/.results/miniapp-answer-submit-offline.png" });
    expect(log).not.toContain("submit");

    // 3) Internet qaytdi: qayta bosilganda avval javob, keyin topshirish
    await page.unroute(ANSWERS);
    await dialog.getByRole("button", { name: "Topshirish" }).click();
    await expect(page.getByTestId("waiting")).toContainText("Test topshirildi");
    expect(log.slice(-2)).toEqual([w.questionIds[1], "submit"]);
  } finally {
    await w.close();
  }
});
