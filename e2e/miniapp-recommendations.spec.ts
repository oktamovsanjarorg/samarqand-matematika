import { expect, test, type APIRequestContext } from "@playwright/test";
import { adminHeaders, apiPost, createStudent, grantFree } from "./api";
import { E2E_PREFIX, openAsTelegram } from "./telegram";

const API = "http://127.0.0.1:4300/api";
const opts = (texts: string[]) => texts.map((text, i) => ({ id: "abcd"[i] ?? "z", text }));

/** Nashr qilingan kurs, mavzu, dars va 3 ta "kasrlar" ko'nikmali savol */
async function seedWeakTopic(request: APIRequestContext) {
  const admin = await adminHeaders(request);
  const course = await apiPost<{ id: string }>(request, "/admin/courses", admin, {
    title: `${E2E_PREFIX}Tavsiya ${Date.now()}`,
    isPublished: true,
  });
  const topic = await apiPost<{ id: string }>(request, `/admin/courses/${course.id}/topics`, admin, {
    title: "Oddiy kasrlar",
  });
  await apiPost(request, `/admin/topics/${topic.id}/lessons`, admin, {
    title: "Kasrlarni qoʻshish",
    isPublished: true,
    isFree: true,
  });
  for (const n of [2, 3, 4])
    await apiPost(request, `/admin/topics/${topic.id}/questions`, admin, {
      type: "SINGLE",
      text: `$\\frac{1}{${n}} + \\frac{1}{${n}}$ = ?`,
      options: opts([`$\\frac{2}{${n}}$`, `$\\frac{2}{${2 * n}}$`]),
      answer: { optionId: "a" },
      skills: ["kasrlarni-qoshish"],
      isPublished: true,
    });
  return { admin, topicId: topic.id };
}

test("T-062, BR-R01: mavzu testida xato qilgan o'quvchi Asosiy sahifada faktli tavsiya ko'radi", async ({
  page,
  request,
}) => {
  const { admin, topicId } = await seedWeakTopic(request);
  const s = await createStudent(request, { fullName: "Tavsiya Oquvchi", phone: "998901112271" });
  await grantFree(request, admin, "Tavsiya Oquvchi");
  // Mavzu testini hammasini noto'g'ri ishlaydi
  const attempt = await apiPost<{ id: string; questions: { question: { id: string } }[] }>(
    request,
    `/topics/${topicId}/attempts`,
    s.headers,
    {},
  );
  for (const { question: q } of attempt.questions)
    expect(
      (
        await request.put(`${API}/attempts/${attempt.id}/answers/${q.id}`, {
          headers: s.headers,
          data: { response: { optionId: "b" } },
        })
      ).ok(),
    ).toBe(true);
  await apiPost(request, `/attempts/${attempt.id}/submit`, s.headers, {});

  await openAsTelegram(page, { id: s.tg, first_name: "Oquvchi" }, "/");
  const card = page.getByTestId("recommendation").filter({ hasText: "Oddiy kasrlar" });
  await expect(card).toContainText("3 ta savoldan 0 tasi toʻgʻri (mavzu testi 3)");
  await expect(card).toContainText("Koʻp xato: kasrlarni qoshish");
  await expect(card).toContainText("0%");
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "e2e/.results/miniapp-recommendations.png", fullPage: true });
  await card.getByRole("link", { name: "Darsni takrorlash" }).click();
  await expect(page.getByRole("heading", { name: "Kasrlarni qoʻshish" })).toBeVisible();
});
