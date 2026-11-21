import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminHeaders, apiPost, createStudent, grantFree } from "./api";
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
  return { admin, lessonId: lesson.id };
}

/** WCAG 2 A/AA qoidabuzarliklari: qisqa ko'rinishda (qaysi qoida, qaysi element) */
async function violations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  return r.violations.flatMap((v) =>
    v.nodes.map((n) => `${v.id}: ${n.target.join(" ")} ${n.failureSummary?.split("\n")[1] ?? ""}`),
  );
}

for (const theme of ["light", "dark"] as const)
  test(`T-071: o'quvchi ekranlari WCAG AA (${theme === "dark" ? "tungi" : "kunduzgi"} rejim)`, async ({
    page,
    request,
  }) => {
    const { admin, lessonId } = await seed(request);
    const s = await createStudent(request, { fullName: "Kontrast Tekshiruvchi", phone: "998901112311" });
    await grantFree(request, admin, "Kontrast Tekshiruvchi");
    const found: string[] = [];
    for (const path of ["/", "/lessons", `/lessons/${lessonId}`, "/profile"]) {
      await openAsTelegram(page, { id: s.tg, first_name: "Kontrast" }, path, theme);
      await page.waitForLoadState("networkidle");
      await page.screenshot({
        path: `e2e/.results/a11y-${theme}${path === "/" ? "-home" : path.replace(/\//g, "-")}.png`,
        fullPage: true,
      });
      found.push(...(await violations(page)).map((v) => `${path} ${v}`));
    }
    expect(found).toEqual([]);
  });
