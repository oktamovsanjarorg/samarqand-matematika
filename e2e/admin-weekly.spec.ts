import { downloadText } from "./download";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { adminHeaders, apiPost, createStudent, grantFree, loginAdmin } from "./api";
import { E2E_PREFIX } from "./telegram";

const API = "http://127.0.0.1:4300/api";
const tashkent = (ms: number) => new Date(Date.now() + ms + 5 * 3_600_000).toISOString().slice(0, 16);

/** E2E kurs, mavzu va ikki savol (API orqali) */
async function seed(request: APIRequestContext) {
  const admin = await adminHeaders(request);
  const course = `${E2E_PREFIX}Haftalik ${Date.now()}`;
  const c = await apiPost<{ id: string }>(request, "/admin/courses", admin, { title: course });
  const t = await apiPost<{ id: string }>(request, `/admin/courses/${c.id}/topics`, admin, {
    title: "Kasrlar",
  });
  const opts = [
    { id: "a", text: "1" },
    { id: "b", text: "2" },
  ];
  const q1 = await apiPost<{ id: string }>(request, `/admin/topics/${t.id}/questions`, admin, {
    type: "SINGLE",
    text: "1+1 = ?",
    options: opts,
    answer: { optionId: "b" },
  });
  const q2 = await apiPost<{ id: string }>(request, `/admin/topics/${t.id}/questions`, admin, {
    type: "NUMERIC",
    text: "$\\frac{1}{2}+\\frac{1}{4}$",
    answer: { value: "3/4" },
  });

  return { admin, course, topicId: t.id, questionIds: [q1.id, q2.id] };
}

test("BR-W01, BR-W09, T-076: ustoz haftalik test tuzadi, natijalarni ko'radi, boshlangan test savoli o'zgarmaydi", async ({
  page,
  request,
}) => {
  const { admin, course } = await seed(request);
  await loginAdmin(page, request, "weekly");
  await page.getByRole("link", { name: "Yangi test" }).click();
  const title = `${E2E_PREFIX}1-hafta ${Date.now()}`;
  await page.getByLabel("Nomi").fill(title);
  await page.getByLabel("Ochiladi").fill(tashkent(-3_600_000));
  await page.getByLabel("Mavzu").selectOption({ label: `${course} · Kasrlar` });
  await expect(page.getByTestId("pick")).toHaveCount(2);
  for (const pick of await page.getByTestId("pick").all()) await pick.getByRole("checkbox").check();
  await expect(page.getByTestId("selected").getByRole("listitem")).toHaveCount(2);
  await page.getByText("Nashr qilingan (oʻquvchilar koʻradi)").click();
  await page.screenshot({ path: "e2e/.results/admin-weekly-edit.png", fullPage: true });
  await page.getByRole("button", { name: "Saqlash" }).click();
  const row = page.getByTestId("weekly").filter({ hasText: title });
  await expect(row).toContainText("Ochiq");
  await expect(row).toContainText("2 ta savol · topshirgan: 0");

  // O'quvchi API orqali ishlaydi va topshiradi
  const s = await createStudent(request, { fullName: "Haftalik Yechuvchi", phone: "998901112206" });
  await grantFree(request, admin, "Haftalik Yechuvchi");
  const weekly = (await (await request.get(`${API}/weekly`, { headers: s.headers })).json()) as {
    id: string;
    title: string;
  }[];
  const id = weekly.find((w) => w.title === title)?.id ?? "";
  const att = (await (await request.post(`${API}/weekly/${id}/attempts`, { headers: s.headers })).json()) as {
    id: string;
    questions: { question: { id: string } }[];
  };
  await request.put(`${API}/weekly-attempts/${att.id}/answers/${att.questions[0]?.question.id}`, {
    headers: s.headers,
    data: { response: { optionId: "b" } },
  });
  // BR-W04: yechim rasmi bilan
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(32)]);
  await request.post(`${API}/weekly-attempts/${att.id}/answers/${att.questions[0]?.question.id}/photos`, {
    headers: { ...s.headers, "content-type": "image/png" },
    data: png,
  });
  await request.post(`${API}/weekly-attempts/${att.id}/submit`, { headers: s.headers });

  await page.reload();
  await page.getByTestId("weekly").filter({ hasText: title }).click();
  await expect(page.getByTestId("standings")).toContainText("Haftalik Yechuvchi");
  await expect(page.getByTestId("standings")).toContainText("1/2");
  // T-076: natijalar Excel'ga (CSV)
  const csv = await downloadText(
    page,
    page.getByTestId("standings").getByRole("button", { name: "Excel'ga yuklab olish" }),
  );
  expect(csv.name).toBe(`${title}.xlsx`);
  expect(csv.text).toContain("#;Oʻquvchi;Topshirgan;Toʻgʻri javob;Ball;Savollar");
  expect(csv.text).toMatch(/1;Haftalik Yechuvchi;\d{4}-\d{2}-\d{2} \d{2}:\d{2};\d+;1;2/);
  await page.getByRole("button", { name: "2-savolni olib tashlash" }).click();
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByRole("alert")).toHaveText("Test boshlangan: savollarni oʻzgartirib boʻlmaydi");
  await page.screenshot({ path: "e2e/.results/admin-weekly.png", fullPage: true });
});

test("T-089: ustoz haftalik testdan nusxa oladi: savollar ko'chadi, oyna keyingi haftaga, raqam oshadi", async ({
  page,
  request,
}) => {
  const { admin, questionIds } = await seed(request);
  const n = Date.now() % 100_000;
  const src = await apiPost<{ id: string }>(request, "/admin/weekly", admin, {
    title: `${n}-hafta ${E2E_PREFIX}nusxa`,
    opensAt: new Date(Date.now() - 3_600_000).toISOString(),
    closesAt: new Date(Date.now() + 6 * 86_400_000).toISOString(),
    questionIds,
    isPublished: true,
  });
  await loginAdmin(page, request, `weekly/${src.id}`);
  await page.getByRole("link", { name: "Nusxa olish" }).click();
  await expect(page.getByTestId("copy-hint")).toBeVisible();
  await expect(page.getByLabel("Nomi")).toHaveValue(`${n + 1}-hafta ${E2E_PREFIX}nusxa`);
  await expect(page.getByTestId("selected").getByRole("listitem")).toHaveCount(2);
  await expect(page.getByText("Nashr qilingan (oʻquvchilar koʻradi)")).not.toBeChecked();
  await page.screenshot({ path: "e2e/.results/admin-weekly-copy.png", fullPage: true });
  await page.getByRole("button", { name: "Saqlash" }).click();
  const row = page.getByTestId("weekly").filter({ hasText: `${n + 1}-hafta ${E2E_PREFIX}nusxa` });
  await expect(row).toContainText("Ochilmagan");
  await expect(row).toContainText("2 ta savol");
});

test("T-096: savollar bankida matn bo'yicha qidirib testga qo'shish", async ({ page, request }) => {
  const { admin, course, topicId } = await seed(request);
  const word = `Qidiruvsoz${Date.now()}`;
  await apiPost(request, `/admin/topics/${topicId}/questions`, admin, {
    type: "NUMERIC",
    text: `${word}: $2x=6$ boʻlsa, $x$ ni toping`,
    answer: { value: "3" },
  });
  await loginAdmin(page, request, "weekly");
  await page.getByRole("link", { name: "Yangi test" }).click();
  await page.getByLabel("Savolni qidirish").fill(word.toLowerCase());
  await expect(page.getByTestId("pick")).toHaveCount(1);
  await expect(page.getByTestId("pick")).toContainText(`${course} · Kasrlar`);
  await expect(page.getByLabel("Mavzu")).toBeHidden();
  await page.getByTestId("pick").getByRole("checkbox").check();
  await expect(page.getByTestId("selected").getByRole("listitem")).toHaveCount(1);
  await page.screenshot({ path: "e2e/.results/admin-question-search.png", fullPage: true });
  await page.getByLabel("Savolni qidirish").fill("");
  await expect(page.getByLabel("Mavzu")).toBeVisible();
});
