import type { AdminMockDetail, AdminMockRow, ExamTemplateInput } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
let templateId: string;
let assistant: Record<string, string>;
const TEMPLATE: ExamTemplateInput = {
  name: "Kichik mock shabloni",
  durationMin: 30,
  scaleMax: 75,
  sections: [
    { title: "Yopiq", types: ["SINGLE"], count: 1, points: 1.5 },
    { title: "Ochiq", types: ["NUMERIC", "EXPRESSION"], count: 1, points: 3 },
  ],
  grades: [{ label: "A", min: 60 }],
};

beforeAll(async () => {
  f = await weeklyFixture();
  templateId = (await f.call("POST", "/admin/exam-templates", f.teacher, TEMPLATE)).json().id;
  const a = await f.student(false);
  await f.prisma.user.update({ where: { id: a.id }, data: { role: "ASSISTANT" } });
  assistant = a.headers;
});
afterAll(async () => {
  await f.prisma.mockTest.deleteMany({ where: { templateId } });
  await f.prisma.examTemplate.deleteMany({ where: { id: templateId } });
  await f.cleanup();
});

const body = (sections: string[][], extra: object = {}) => ({
  title: "1-mock",
  templateId,
  opensAt: f.at(-f.HOUR),
  closesAt: f.at(48 * f.HOUR),
  sections,
  isPublished: true,
  ...extra,
});

describe("Mock: ustoz tomoni (T-051)", () => {
  it("BR-M01: mock shablon bo'limlariga mos savollar bilan yaratiladi; shablon nusxasi saqlanadi", async () => {
    const [single = "", numeric = ""] = await f.questions();
    const res = await f.call("POST", "/admin/mocks", assistant, body([[single], [numeric]]));
    expect(res.statusCode).toBe(201);
    const id = res.json().id as string;

    // Shablon keyin o'zgarsa ham mockdagi nusxa o'zgarmaydi
    await f.call("PUT", `/admin/exam-templates/${templateId}`, f.teacher, { ...TEMPLATE, durationMin: 99 });
    const d = (await f.call("GET", `/admin/mocks/${id}`, f.teacher)).json() as AdminMockDetail;
    expect(d.template.durationMin).toBe(30);
    expect(d.sections.map((s) => s.map((q) => q.id))).toEqual([[single], [numeric]]);
    expect(d).toMatchObject({ templateName: TEMPLATE.name, questionCount: 2, status: "OPEN", submitted: 0 });
    const rows = (await f.call("GET", "/admin/mocks", f.teacher)).json() as AdminMockRow[];
    expect(rows.some((r) => r.id === id)).toBe(true);

    const edit = await f.call(
      "PUT",
      `/admin/mocks/${id}`,
      f.teacher,
      body([[single], [numeric]], { title: "Yangi nom" }),
    );
    expect(edit.statusCode).toBe(200);
    expect((await f.call("DELETE", `/admin/mocks/${id}`, f.teacher)).statusCode).toBe(204);
  });

  it("bo'limga mos kelmaydigan savollar 400: soni, turi, bo'limlar soni, takror", async () => {
    const [single = "", numeric = ""] = await f.questions();
    const bad = [
      [[single, numeric], []],
      [[numeric], [single]],
      [[single]],
      [[single], [single]],
      [[single], ["yoq"]],
    ];
    for (const sections of bad)
      expect((await f.call("POST", "/admin/mocks", f.teacher, body(sections))).statusCode).toBe(400);
    expect(
      (await f.call("POST", "/admin/mocks", f.teacher, body([[single], [numeric]], { templateId: "yoq" })))
        .statusCode,
    ).toBe(400);
  });

  it("o'quvchiga admin mock endpointlari 403", async () => {
    const s = await f.student();
    expect((await f.call("GET", "/admin/mocks", s.headers)).statusCode).toBe(403);
    expect((await f.call("POST", "/admin/mocks", s.headers, body([]))).statusCode).toBe(403);
  });
});
