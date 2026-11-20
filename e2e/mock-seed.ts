import type { APIRequestContext } from "@playwright/test";
import { adminHeaders, apiPost } from "./api";
import { E2E_PREFIX } from "./telegram";

const HOUR = 3_600_000;
const at = (ms: number) => new Date(Date.now() + ms).toISOString();

/** E2E kurs (bitta javob va son savollari) va ikki bo'limli imtihon shabloni */
export async function seedMockBase(request: APIRequestContext) {
  const admin = await adminHeaders(request);
  const stamp = Date.now();
  const c = await apiPost<{ id: string }>(request, "/admin/courses", admin, {
    title: `${E2E_PREFIX}Mock ${stamp}`,
  });
  const t = await apiPost<{ id: string }>(request, `/admin/courses/${c.id}/topics`, admin, {
    title: "Aralash",
  });
  const add = async (q: object) =>
    (await apiPost<{ id: string }>(request, `/admin/topics/${t.id}/questions`, admin, q)).id;
  const single = await add({
    type: "SINGLE",
    text: "$3 \\cdot 4$ = ?",
    options: [
      { id: "a", text: "7" },
      { id: "b", text: "12" },
    ],
    answer: { optionId: "b" },
  });
  const numeric = await add({
    type: "NUMERIC",
    text: "$\\frac{1}{2}+\\frac{1}{4}$ = ?",
    answer: { value: "3/4" },
  });
  const template = await apiPost<{ id: string }>(request, "/admin/exam-templates", admin, {
    name: `${E2E_PREFIX}Shablon ${stamp}`,
    durationMin: 30,
    scaleMax: 75,
    sections: [
      { title: "Yopiq savollar", types: ["SINGLE"], count: 1, points: 1.5 },
      { title: "Ochiq javob", types: ["NUMERIC"], count: 1, points: 3 },
    ],
    grades: [
      { label: "A", min: 60 },
      { label: "C", min: 20 },
    ],
  });
  return { admin, course: `${E2E_PREFIX}Mock ${stamp}`, single, numeric, templateId: template.id, stamp };
}

/** Ochiq, nashr qilingan mock */
export async function seedMock(request: APIRequestContext) {
  const base = await seedMockBase(request);
  const body = {
    title: `${E2E_PREFIX}Mock ${base.stamp}`,
    templateId: base.templateId,
    opensAt: at(-HOUR),
    closesAt: at(48 * HOUR),
    sections: [[base.single], [base.numeric]],
    isPublished: true,
  };
  const m = await apiPost<{ id: string }>(request, "/admin/mocks", base.admin, body);
  return { ...base, id: m.id, body };
}
