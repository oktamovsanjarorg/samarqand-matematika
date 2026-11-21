import { expect, test, type APIRequestContext } from "@playwright/test";
import { adminHeaders, apiPost, createStudent, grantFree, requestParentLink } from "./api";
import { shotName, violations } from "./axe";
import { E2E_PREFIX, openAsTelegram } from "./telegram";

/** Kurs, mavzu, bepul dars va bitta savol: ekranlar bo'sh bo'lmasin */
async function seed(request: APIRequestContext) {
  const admin = await adminHeaders(request);
  const course = await apiPost<{ id: string }>(request, "/admin/courses", admin, {
    title: `${E2E_PREFIX}Kontrast ${Date.now()}`,
    isPublished: true,
  });
  const topic = await apiPost<{ id: string }>(request, `/admin/courses/${course.id}/topics`, admin, {
    title: "Tenglamalar",
  });
  const lesson = await apiPost<{ id: string }>(request, `/admin/topics/${topic.id}/lessons`, admin, {
    title: "Chiziqli tenglama",
    body: "$ax + b = 0$ tenglamaning yechimi $$x = -\\frac{b}{a}$$",
    isFree: true,
    isPublished: true,
  });
  await apiPost(request, `/admin/topics/${topic.id}/questions`, admin, {
    type: "NUMERIC",
    text: "$2x + 4 = 0$ boʻlsa, $x$ = ?",
    answer: { value: "-2" },
    isPublished: true,
  });
  return { admin, lessonId: lesson.id, topicId: topic.id };
}

for (const theme of ["light", "dark"] as const)
  test(`T-071: o'quvchi va ota-ona ekranlari WCAG AA (${theme === "dark" ? "tungi" : "kunduzgi"} rejim)`, async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000);
    const { admin, lessonId, topicId } = await seed(request);
    const phone = `99890${String(Date.now()).slice(-7)}`;
    const s = await createStudent(request, { fullName: "Kontrast Tekshiruvchi", phone });
    await grantFree(request, admin, "Kontrast Tekshiruvchi");
    const paths = [
      "/",
      "/lessons",
      `/lessons/${lessonId}`,
      `/topics/${topicId}/test`,
      "/weekly",
      "/mocks",
      "/tutor",
      "/mistakes",
    ];
    const found: string[] = [];
    for (const path of [...paths, "/billing", "/profile"]) {
      await openAsTelegram(page, { id: s.tg, first_name: "Kontrast" }, path, theme);
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: `e2e/.results/a11y-${theme}-${shotName(path)}.png`, fullPage: true });
      found.push(...(await violations(page, path)));
    }
    const parent = await requestParentLink(request, s.tg, phone);
    for (const path of ["/", "/profile"]) {
      await openAsTelegram(page, parent, path, theme);
      await page.waitForLoadState("networkidle");
      await page.screenshot({
        path: `e2e/.results/a11y-${theme}-parent-${shotName(path)}.png`,
        fullPage: true,
      });
      found.push(...(await violations(page, `ota-ona ${path}`)));
    }
    expect(found).toEqual([]);
  });
