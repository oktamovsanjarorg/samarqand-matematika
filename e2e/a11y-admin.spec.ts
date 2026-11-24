import { type APIRequestContext, expect, test } from "@playwright/test";
import { apiPost, createStudent, loginAdmin } from "./api";
import { violations } from "./axe";
import { E2E_PREFIX } from "./telegram";
import { seedWeekly } from "./weekly-seed";

const PAGES = [
  "",
  "content",
  "students",
  "parents",
  "payments",
  "broadcast",
  "weekly",
  "weekly/new",
  "mocks",
  "mocks/new",
  "groups",
  "offline",
  "ai",
  "ai/chats",
  "stats",
  "settings",
  "audit",
  "trash",
];

test("T-072: admin bo'limlari WCAG AA", async ({ page, request }) => {
  test.setTimeout(180_000);
  await loginAdmin(page, request);
  const found: string[] = [];
  for (const path of PAGES) {
    await page.goto(`http://127.0.0.1:5191/admin/${path}`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `e2e/.results/a11y-admin-${path.replace("/", "-") || "home"}.png`,
      fullPage: true,
    });
    found.push(...(await violations(page, `/${path}`)));
  }
  expect(found).toEqual([]);
});

const API = "http://127.0.0.1:4300/api";

/** T-142: ma'lumotli sahifalar uchun kurs, mavzu, savol, dars, qabul qilingan o'quvchi, guruh va haftalik */
async function seedDynamic(request: APIRequestContext) {
  const w = await seedWeekly(request);
  const h = w.admin;
  const stamp = [...String(Date.now()).slice(-6)].map((d) => "abcdefghij"[Number(d)]).join("");
  const c = await apiPost<{ id: string }>(request, "/admin/courses", h, {
    title: `${E2E_PREFIX}A11y ${stamp}`,
  });
  const t = await apiPost<{ id: string }>(request, `/admin/courses/${c.id}/topics`, h, { title: "Kasrlar" });
  const q = await apiPost<{ id: string }>(request, `/admin/topics/${t.id}/questions`, h, {
    type: "NUMERIC",
    text: "$\\frac{1}{2}+\\frac{1}{4}$ = ?",
    answer: { value: "3/4" },
  });
  const l = await apiPost<{ id: string }>(request, `/admin/topics/${t.id}/lessons`, h, {
    title: "Kasrlarni qoʻshish",
    body: "Umumiy maxrajga keltiramiz: $\\frac{a}{b}+\\frac{c}{d}$",
  });
  await createStudent(request, { fullName: `Erkin Axe${stamp}`, phone: "998901112340" });
  const found = await request.get(`${API}/admin/students?filter=all&q=${stamp}`, { headers: h });
  const [s] = (await found.json()) as { id: string }[];
  await apiPost(request, `/admin/students/${s?.id}/accept`, h, {});
  const g = await apiPost<{ id: string }>(request, "/admin/groups", h, {
    name: `${E2E_PREFIX}A11y ${stamp}`,
  });
  await apiPost(request, `/admin/groups/${g.id}/students`, h, { userIds: [s?.id] });
  const paths = [
    `students/${s?.id}`,
    `groups/${g.id}`,
    `content/topics/${t.id}/questions`,
    `content/topics/${t.id}/questions/new`,
    `content/questions/${q.id}`,
    `content/lessons/${l.id}`,
    `weekly/${w.id}`,
    `weekly/${w.id}/review`,
  ];
  return { paths, close: w.close };
}

test("T-142: maʼlumotli admin sahifalari (karta, guruh, savol, dars, tekshiruv) WCAG AA", async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  const { paths, close } = await seedDynamic(request);
  try {
    await loginAdmin(page, request);
    const found: string[] = [];
    for (const path of paths) {
      await page.goto(`http://127.0.0.1:5191/admin/${path}`);
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("alert")).toHaveCount(0);
      const shot = path.replace(/c[a-z0-9]{20,}/g, "id").replace(/\//g, "-");
      await page.screenshot({ path: `e2e/.results/a11y-admin-${shot}.png`, fullPage: true });
      found.push(...(await violations(page, `/${path.replace(/c[a-z0-9]{20,}/g, ":id")}`)));
    }
    expect(found).toEqual([]);
  } finally {
    await close();
  }
});
