import { expect, test } from "@playwright/test";
import { adminHeaders, apiPost, createStudent, grantFree, loginAdmin } from "./api";
import { E2E_PREFIX, openAsTelegram } from "./telegram";

test("T-074, T-077, T-085, BR-Q03: ustoz ifoda savolini qo'shadi, o'quvchining teng ifodasi to'g'ri hisoblanadi", async ({
  page,
  request,
}) => {
  const admin = await adminHeaders(request);
  const title = `${E2E_PREFIX}Ifoda ${Date.now()}`;
  const course = await apiPost<{ id: string }>(request, "/admin/courses", admin, {
    title,
    isPublished: true,
  });
  const topic = await apiPost<{ id: string }>(request, `/admin/courses/${course.id}/topics`, admin, {
    title: "Qisqa koʻpaytirish",
  });

  await loginAdmin(page, request, `content/topics/${topic.id}/questions/new`);
  await page.getByLabel("Savol turi").selectOption("EXPRESSION");
  await page.getByLabel("Savol matni").fill("Qavslarni oching: $(x-1)(x+1)$");
  await page.getByLabel("Toʻgʻri ifoda").fill("x^2 = 1");
  await expect(page.getByTestId("expression-status")).toHaveText("Ifoda oʻqilmadi: tekshirib boʻlmaydi");
  await page.getByLabel("Toʻgʻri ifoda").fill("x^2-1");
  await expect(page.getByTestId("expression-status")).toContainText("2(x+1) va 2x+2 bir xil");
  await page.getByText("Nashr qilingan (testga tushadi)").click();
  await page.screenshot({ path: "e2e/.results/admin-question-expression.png", fullPage: true });
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByTestId("question")).toHaveCount(1);
  await expect(page.getByTestId("question").getByText("Ustoz tekshiradi")).toHaveCount(0);
  // T-085: qo'lda tekshiriladigan ifoda ro'yxatda belgi bilan
  await apiPost(request, `/admin/topics/${topic.id}/questions`, admin, {
    type: "EXPRESSION",
    text: "Tengsizlikni yeching: $x^2 < 4$",
    answer: { value: "-2 < x < 2", manual: true },
  });
  await page.reload();
  await expect(page.getByTestId("question").getByText("Ustoz tekshiradi")).toHaveCount(1);
  await page.screenshot({ path: "e2e/.results/admin-questions-manual.png", fullPage: true });

  const s = await createStudent(request, { fullName: "Ifoda Yozuvchi", phone: "998901112321" });
  await grantFree(request, admin, "Ifoda Yozuvchi");
  await openAsTelegram(page, { id: s.tg, first_name: "Ifoda" }, `/topics/${topic.id}/test`);
  await expect(page.getByLabel("Javob", { exact: true })).toHaveAttribute(
    "placeholder",
    "Masalan: 2(x+1) yoki x^2-1",
  );
  // T-077: tushunilmagan yozuv darhol aytiladi, to'g'risi formula bo'lib chiqadi
  await page.getByLabel("Javob", { exact: true }).fill("x^2 = 1");
  await expect(page.getByTestId("expression-preview")).toContainText("Ifoda tushunilmadi");
  await page.getByLabel("Javob", { exact: true }).fill("x² − 1");
  await expect(page.getByTestId("expression-preview").locator(".katex")).toBeVisible();
  await page.screenshot({ path: "e2e/.results/miniapp-expression-preview.png" });
  await page.getByRole("button", { name: "Yakunlash" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Topshirish" }).click();
  await expect(page.getByTestId("score")).toContainText("1/1");
  await expect(page.getByTestId("score")).not.toContainText("Ustoz tekshiradi");
  await page.screenshot({ path: "e2e/.results/miniapp-expression-result.png", fullPage: true });
});
