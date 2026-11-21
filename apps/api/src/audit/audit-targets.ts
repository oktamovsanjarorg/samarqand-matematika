import type { PrismaService } from "../prisma/prisma.service";
import { PERSON_SELECT, personName } from "../common/person";

type Pair = [string, string];
type Resolver = (p: PrismaService, ids: string[]) => Promise<Pair[]>;

const inIds = (ids: string[]) => ({ where: { id: { in: ids } } });
const titled = (rows: { id: string; title: string }[]): Pair[] => rows.map((r) => [r.id, r.title]);
const named = (rows: { id: string; name: string }[]): Pair[] => rows.map((r) => [r.id, r.name]);
const owner = { select: { id: true, user: { select: PERSON_SELECT } } } as const;
const people = (rows: { id: string; user: Parameters<typeof personName>[0] }[]): Pair[] =>
  rows.map((r) => [r.id, personName(r.user)]);
const TITLE = { select: { id: true, title: true } } as const;
const NAME = { select: { id: true, name: true } } as const;

/** Audit obyektining odamga tushunarli nomi: har obyekt turi uchun bitta so'rov (T-075) */
const RESOLVERS: Record<string, Resolver> = {
  Course: async (p, ids) => titled(await p.course.findMany({ ...inIds(ids), ...TITLE })),
  Topic: async (p, ids) => titled(await p.topic.findMany({ ...inIds(ids), ...TITLE })),
  Lesson: async (p, ids) => titled(await p.lesson.findMany({ ...inIds(ids), ...TITLE })),
  WeeklyTest: async (p, ids) => titled(await p.weeklyTest.findMany({ ...inIds(ids), ...TITLE })),
  MockTest: async (p, ids) => titled(await p.mockTest.findMany({ ...inIds(ids), ...TITLE })),
  OfflineTest: async (p, ids) => titled(await p.offlineTest.findMany({ ...inIds(ids), ...TITLE })),
  Group: async (p, ids) => named(await p.group.findMany({ ...inIds(ids), ...NAME })),
  Plan: async (p, ids) => named(await p.plan.findMany({ ...inIds(ids), ...NAME })),
  ExamTemplate: async (p, ids) => named(await p.examTemplate.findMany({ ...inIds(ids), ...NAME })),
  Question: async (p, ids) =>
    (await p.question.findMany({ ...inIds(ids), select: { id: true, text: true } })).map((r) => [
      r.id,
      r.text.length > 60 ? `${r.text.slice(0, 60)}…` : r.text,
    ]),
  User: async (p, ids) =>
    (await p.user.findMany({ ...inIds(ids), select: { id: true, ...PERSON_SELECT } })).map((u) => [
      u.id,
      personName(u),
    ]),
  Payment: async (p, ids) => people(await p.payment.findMany({ ...inIds(ids), ...owner })),
  WeeklyAttempt: async (p, ids) => people(await p.weeklyAttempt.findMany({ ...inIds(ids), ...owner })),
  ParentLink: async (p, ids) =>
    (
      await p.parentLink.findMany({
        ...inIds(ids),
        select: { id: true, student: { select: { fullName: true } } },
      })
    ).map((r) => [r.id, r.student.fullName ?? ""]),
};

/** entity:id → nom */
export async function auditTargets(
  prisma: PrismaService,
  rows: { entity: string; entityId: string | null }[],
): Promise<Map<string, string>> {
  const ids = new Map<string, Set<string>>();
  for (const r of rows) if (r.entityId) ids.set(r.entity, (ids.get(r.entity) ?? new Set()).add(r.entityId));
  const out = new Map<string, string>();
  await Promise.all(
    [...ids].map(async ([entity, set]) => {
      const resolve = RESOLVERS[entity];
      if (!resolve) return;
      for (const [id, name] of await resolve(prisma, [...set])) if (name) out.set(`${entity}:${id}`, name);
    }),
  );
  return out;
}
