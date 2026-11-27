import { expect, test } from "@playwright/test";
import { createStudent, grantFree } from "./api";
import { openAsTelegram } from "./telegram";
import { seedWeekly } from "./weekly-seed";

const ANSWERS = "**/api/weekly-attempts/*/answers/*";

test("T-192: saqlanmagan javob ilova yopilsa ham telefonda qoladi va qayta ochilganda serverga ketadi", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const w = await seedWeekly(request);
  try {
    const s = await createStudent(request, { fullName: "Telefon Oquvchi", phone: "998901112292" });
    await grantFree(request, w.admin, "Telefon Oquvchi");
    const saved: string[] = [];
    page.on("response", (r) => {
      const m = /\/answers\/(\w+)$/.exec(new URL(r.url()).pathname);
      if (m?.[1] && r.ok()) saved.push(m[1]);
    });
    await openAsTelegram(page, { id: s.tg, first_name: "Oquvchi" }, `/weekly/${w.id}`);
    await expect(page.getByText("Haftalik test · 1/2")).toBeVisible();

    // Javob serverga yetmaydi va ilova yopiladi (qayta yuklash)
    await page.route(ANSWERS, (r) => r.abort("internetdisconnected"));
    await page.getByRole("radio").nth(1).click();
    await expect(page.getByRole("alert").filter({ hasText: "Javob saqlanmadi" })).toBeVisible();
    await openAsTelegram(page, { id: s.tg, first_name: "Oquvchi" }, `/weekly/${w.id}`);
    await expect(page.getByRole("radio").nth(1)).toHaveAttribute("aria-checked", "true");
    expect(saved).toEqual([]);

    // Internet qaytdi: javob o'zi serverga ketadi va telefondagi yozuv o'chadi
    await page.unroute(ANSWERS);
    await expect.poll(() => saved, { timeout: 15_000 }).toEqual([w.questionIds[0]]);
    await expect
      .poll(() => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("skd-ans:"))))
      .toEqual([]);
    await page.reload();
    await expect(page.getByRole("radio").nth(1)).toHaveAttribute("aria-checked", "true");
  } finally {
    await w.close();
  }
});
