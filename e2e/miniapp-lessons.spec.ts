import { expect, test } from "@playwright/test";
import { adminHeaders, apiPost, createStudent } from "./api";
import { E2E_PREFIX, openAsTelegram } from "./telegram";

test("BR-C01, BR-C02: o'quvchi darslarni ko'radi, bepul dars ochiq, pullik yopiq", async ({
  page,
  request,
}) => {
  const admin = await adminHeaders(request);
  const title = `${E2E_PREFIX}Geometriya ${Date.now()}`;
  const course = await apiPost<{ id: string }>(request, "/admin/courses", admin, {
    title,
    isPublished: true,
  });
  const topic = await apiPost<{ id: string }>(request, `/admin/courses/${course.id}/topics`, admin, {
    title: "Uchburchak",
  });
  await apiPost(request, `/admin/topics/${topic.id}/lessons`, admin, {
    title: "Pifagor teoremasi",
    body: "Toʻgʻri burchakli uchburchakda $$a^2 + b^2 = c^2$$",
    isFree: true,
    isPublished: true,
  });
  await apiPost(request, `/admin/topics/${topic.id}/lessons`, admin, {
    title: "Yopiq dars",
    body: "maxfiy",
    isPublished: true,
  });
  await apiPost(request, `/admin/topics/${topic.id}/lessons`, admin, { title: "Qoralama dars" });
  await apiPost(request, `/admin/topics/${topic.id}/questions`, admin, {
    type: "NUMERIC",
    text: "$3^2 + 4^2 = c^2$ boʻlsa, $c$ = ?",
    answer: { value: "5" },
    isPublished: true,
  });

  const s = await createStudent(request, { fullName: "Dars Koruvchi", phone: "998901112202" });
  await openAsTelegram(page, { id: s.tg, first_name: "Oquvchi" }, "/lessons");
  const course1 = page.getByTestId("course").filter({ hasText: title });
  await expect(course1.getByText("Pifagor teoremasi")).toBeVisible();
  await expect(course1.getByText("Bepul")).toBeVisible();
  await expect(course1.getByLabel("Yopiq")).toBeVisible();
  await expect(course1.getByText("Qoralama dars")).toHaveCount(0);
  await page.screenshot({ path: "e2e/.results/miniapp-lessons.png", fullPage: true });

  await course1.getByText("Pifagor teoremasi").click();
  await expect(page.getByRole("heading", { name: "Pifagor teoremasi" })).toBeVisible();
  await expect(page.locator(".katex-display")).toBeVisible();
  // T-066: dars oxirida mavzu testi va keyingi dars (qoralama tashlab o'tiladi)
  const footer = page.getByTestId("lesson-footer");
  await expect(footer.getByRole("link", { name: /Mavzu testini ishlash · 1 savol/ })).toHaveAttribute(
    "href",
    `/topics/${topic.id}/test`,
  );
  await expect(footer.getByText("Oldingi dars")).toHaveCount(0);
  await page.screenshot({ path: "e2e/.results/miniapp-lesson.png", fullPage: true });

  await footer.getByRole("link", { name: /Keyingi dars.*Yopiq dars/ }).click();
  await expect(page.getByText("Bu dars obuna bilan ochiladi")).toBeVisible();
  await expect(page.getByText("maxfiy")).toHaveCount(0);
});
