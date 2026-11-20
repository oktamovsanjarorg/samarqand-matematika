import type { APIRequestContext, Browser } from "@playwright/test";
import { adminHeaders, apiPost } from "./api";
import { E2E_PREFIX } from "./telegram";

const API = "http://127.0.0.1:4300/api";
const HOUR = 3_600_000;
const at = (ms: number) => new Date(Date.now() + ms).toISOString();
type Headers = Record<string, string>;

export async function notebookPng(browser: Browser) {
  const draw = await browser.newPage({ viewport: { width: 360, height: 480 } });
  await draw.setContent(
    '<div style="height:100vh;display:grid;place-items:center;background:#fdf6e3;font:bold 56px serif;color:#123">1+1=2</div>',
  );
  const png = await draw.screenshot();
  await draw.close();
  return png;
}

/** Ochiq haftalik test va ikki savol; close() oynani yopadi */
export async function seedWeekly(request: APIRequestContext) {
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

/** O'quvchi API orqali: 1-savol to'g'ri + rasm; 2-savol "6" (xato, rasmsiz), full bo'lsa "8" + rasm */
export async function solveWeekly(
  request: APIRequestContext,
  s: { headers: Headers },
  p: { testId: string; png: Buffer; full?: boolean },
) {
  const att = (await (
    await request.post(`${API}/weekly/${p.testId}/attempts`, { headers: s.headers })
  ).json()) as { id: string; questions: { question: { id: string } }[] };
  const [q0, q1] = att.questions.map((q) => q.question.id);
  const put = (qid: string | undefined, response: object) =>
    request.put(`${API}/weekly-attempts/${att.id}/answers/${qid}`, {
      headers: s.headers,
      data: { response },
    });
  const photo = (qid: string | undefined) =>
    request.post(`${API}/weekly-attempts/${att.id}/answers/${qid}/photos`, {
      headers: { ...s.headers, "content-type": "image/png" },
      data: p.png,
    });
  await put(q0, { optionId: "b" });
  await put(q1, { value: p.full ? "8" : "6" });
  await photo(q0);
  if (p.full) await photo(q1);
  await request.post(`${API}/weekly-attempts/${att.id}/submit`, { headers: s.headers });
}
