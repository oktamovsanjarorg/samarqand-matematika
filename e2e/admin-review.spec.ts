import { expect, test, type APIRequestContext, type Browser } from "@playwright/test";
import { adminHeaders, apiPost, createStudent, grantFree, loginAdmin } from "./api";
import { E2E_PREFIX, openAsTelegram } from "./telegram";

const API = "http://127.0.0.1:4300/api";
const HOUR = 3_600_000;
const at = (ms: number) => new Date(Date.now() + ms).toISOString();
type Headers = Record<string, string>;

async function notebookPng(browser: Browser) {
  const draw = await browser.newPage({ viewport: { width: 360, height: 480 } });
  await draw.setContent(
    '<div style="height:100vh;display:grid;place-items:center;background:#fdf6e3;font:bold 56px serif;color:#123">1+1=2</div>',
  );
  const png = await draw.screenshot();
  await draw.close();
  return png;
}

/** Ochiq haftalik test va ikki savol; close() oynani yopadi */
async function seed(request: APIRequestContext) {
  const admin = await adminHeaders(request);
  const c = await apiPost<{ id: string }>(request, "/admin/courses", admin, {
    title: `${E2E_PREFIX}Navbat ${Date.now()}`,
  });
  const t = await apiPost<{ id: string }>(request, `/admin/courses/${c.id}/topics`, admin, {
    title: "Aralash",
  });
  const add = async (q: object) =>
    (await apiPost<{ id: string }>(request, `/admin/topics/${t.id}/questions`, admin, q)).id;
  const options = [
    { id: "a", text: "1" },
    { id: "b", text: "2" },
  ];
  const questionIds = [
    await add({ type: "SINGLE", text: "1+1 = ?", options, answer: { optionId: "b" } }),
    await add({ type: "NUMERIC", text: "$2^3$ = ?", answer: { value: "8" } }),
  ];
  const body = {
    title: `${E2E_PREFIX}Navbat haftasi ${Date.now()}`,
    opensAt: at(-HOUR),
    closesAt: at(48 * HOUR),
    questionIds,
    isPublished: true,
  };
  const w = await apiPost<{ id: string }>(request, "/admin/weekly", admin, body);
  const close = () =>
    request.put(`${API}/admin/weekly/${w.id}`, {
      headers: admin,
      data: { ...body, opensAt: at(-2 * HOUR), closesAt: at(-60_000) },
    });
  return { admin, id: w.id, questionIds, close };
}

/** O'quvchi API orqali: 1-savol to'g'ri + rasm, 2-savol "6" (xato, rasmsiz) */
async function solve(request: APIRequestContext, s: { headers: Headers }, testId: string, png: Buffer) {
  const att = (await (
    await request.post(`${API}/weekly/${testId}/attempts`, { headers: s.headers })
  ).json()) as { id: string; questions: { question: { id: string } }[] };
  const [q0, q1] = att.questions.map((q) => q.question.id);
  const put = (qid: string | undefined, response: object) =>
    request.put(`${API}/weekly-attempts/${att.id}/answers/${qid}`, {
      headers: s.headers,
      data: { response },
    });
  await put(q0, { optionId: "b" });
  await put(q1, { value: "6" });
  await request.post(`${API}/weekly-attempts/${att.id}/answers/${q0}/photos`, {
    headers: { ...s.headers, "content-type": "image/png" },
    data: png,
  });
  await request.post(`${API}/weekly-attempts/${att.id}/submit`, { headers: s.headers });
}

test("BR-W05, BR-W06: ustoz navbatda bir xil xatoni ko'radi, ball qo'yadi, o'quvchi izohni oladi", async ({
  page,
  request,
  browser,
}) => {
  const { admin, id, close } = await seed(request);
  const png = await notebookPng(browser);
  const a = await createStudent(request, { fullName: "Navbat Birinchi", phone: "998901112209" });
  const b = await createStudent(request, { fullName: "Navbat Ikkinchi", phone: "998901112210" });
  for (const n of ["Navbat Birinchi", "Navbat Ikkinchi"]) await grantFree(request, admin, n);
  await solve(request, a, id, png);
  await solve(request, b, id, png);

  await loginAdmin(page, request, `weekly/${id}/review`);
  await expect(page.getByRole("tab", { name: "Tekshirilmagan (4)" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Shubhali (2)" })).toBeVisible();
  const first = page.getByTestId("review-item").first();
  await expect(first).toContainText("Bir xil xato: yana 1 kishi");
  await expect(first).toContainText("Navbat Birinchi · 2-savol");
  await expect(first).toContainText("Avtomatik: 0 ball (yechim rasmi yoʻq)");
  await first.getByLabel("Izoh").fill("Daraja: 2·2·2 = 8, koʻpaytirishni tekshir");
  await first.getByRole("button", { name: "0 ball" }).click();
  await expect(page.getByRole("tab", { name: "Tekshirilmagan (3)" })).toBeVisible();
  const photoCard = page.getByTestId("review-item").filter({ hasText: "1-savol" }).first();
  await expect(photoCard.getByRole("img", { name: "Yechim rasmi 1" })).toBeVisible();
  await photoCard.getByRole("button", { name: "1 ball" }).click();
  await page.screenshot({ path: "e2e/.results/admin-review.png", fullPage: true });
  await page.getByRole("tab", { name: "Hammasi (4)" }).click();
  await expect(page.getByText("Ustoz: 0 ball")).toBeVisible();

  expect((await close()).ok()).toBe(true);
  await openAsTelegram(page, { id: a.tg, first_name: "Oquvchi" }, `/weekly/${id}`);
  await expect(page.getByTestId("score")).toContainText("1/2");
  await expect(page.getByTestId("feedback")).toContainText("Ustoz izohi: Daraja: 2·2·2 = 8");
  await page.screenshot({ path: "e2e/.results/miniapp-weekly-feedback.png", fullPage: true });
});
