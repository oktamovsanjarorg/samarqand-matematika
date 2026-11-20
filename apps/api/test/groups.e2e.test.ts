import type { AdminGroupDetail, AdminGroupRow, AdminStudentRow } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
const groupIds: string[] = [];
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.prisma.group.deleteMany({ where: { id: { in: groupIds } } });
  await f.cleanup();
});

const create = async (name: string, schedule?: string) => {
  const res = await f.call("POST", "/admin/groups", f.teacher, { name, schedule });
  expect(res.statusCode).toBe(201);
  groupIds.push(res.json().id);
  return res.json().id as string;
};

describe("offline guruhlar (T-054)", () => {
  it("BR-G01: ustoz guruh tuzadi, o'quvchi qo'shadi; boshqa guruhga qo'shilsa ko'chadi; olib tashlaydi", async () => {
    const a = await create("Dushanba 14:00 guruhi", "Du/Chor/Ju 14:00");
    const b = await create("Kechki guruh");
    const [s1, s2] = [await f.student(), await f.student()];
    await f.prisma.studentProfile.update({ where: { userId: s1.id }, data: { fullName: "Aziz Karimov" } });

    const added = (
      await f.call("POST", `/admin/groups/${a}/students`, f.teacher, { userIds: [s1.id, s2.id] })
    ).json();
    expect((added as AdminGroupDetail).students.map((s) => s.id).sort()).toEqual([s1.id, s2.id].sort());
    const rows = (await f.call("GET", "/admin/groups", f.teacher)).json() as AdminGroupRow[];
    expect(rows.find((r) => r.id === a)).toMatchObject({
      studentCount: 2,
      schedule: "Du/Chor/Ju 14:00",
      isActive: true,
    });
    const students = (
      await f.call("GET", "/admin/students?filter=all&q=Aziz", f.teacher)
    ).json() as AdminStudentRow[];
    expect(students.find((x) => x.id === s1.id)?.groupName).toBe("Dushanba 14:00 guruhi");

    await f.call("POST", `/admin/groups/${b}/students`, f.teacher, { userIds: [s1.id] });
    const ga = (await f.call("GET", `/admin/groups/${a}`, f.teacher)).json() as AdminGroupDetail;
    expect(ga.students.map((s) => s.id)).toEqual([s2.id]);
    const removed = await f.call("DELETE", `/admin/groups/${a}/students/${s2.id}`, f.teacher);
    expect((removed.json() as AdminGroupDetail).students).toEqual([]);
    expect((await f.call("DELETE", `/admin/groups/${a}/students/${s2.id}`, f.teacher)).statusCode).toBe(404);

    const patched = await f.call("PATCH", `/admin/groups/${a}`, f.teacher, { isActive: false });
    expect(patched.json()).toMatchObject({ isActive: false });
  });

  it("noto'g'ri ma'lumot 400/404; o'quvchiga 403", async () => {
    const g = await create("Sinov guruhi");
    expect((await f.call("POST", "/admin/groups", f.teacher, { name: "A" })).statusCode).toBe(400);
    expect(
      (await f.call("POST", `/admin/groups/${g}/students`, f.teacher, { userIds: ["yoq"] })).statusCode,
    ).toBe(400);
    expect((await f.call("GET", "/admin/groups/yoq", f.teacher)).statusCode).toBe(404);
    const s = await f.student();
    expect((await f.call("GET", "/admin/groups", s.headers)).statusCode).toBe(403);
    expect(
      (await f.call("POST", `/admin/groups/${g}/students`, s.headers, { userIds: [s.id] })).statusCode,
    ).toBe(403);
  });
});
