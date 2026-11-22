import type { AdminDashboard } from "@samarqand/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BACKUP_KEY, backupStaleSince } from "../src/dashboard/backup-status";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(async () => {
  await f.prisma.appSetting.deleteMany({ where: { key: BACKUP_KEY } });
  await f.cleanup();
});

const HOUR = 3_600_000;
/** backup.sh bilan bir xil: updatedAt'ni SQL'da qo'yadi */
const markBackup = (at: Date) =>
  f.prisma
    .$executeRaw`insert into "AppSetting" (key, value, "updatedAt") values (${BACKUP_KEY}, 'true', ${at})
    on conflict (key) do update set "updatedAt" = ${at}`;

describe("zaxira eskirganini bildirish (T-145)", () => {
  it("yozuv yo'q yoki 36 soatdan yangi bo'lsa null, eski bo'lsa o'sha vaqt; bosh sahifada", async () => {
    await f.prisma.appSetting.deleteMany({ where: { key: BACKUP_KEY } });
    const now = new Date();
    expect(await backupStaleSince(f.prisma, now)).toBeNull();

    await markBackup(new Date(now.getTime() - 35 * HOUR));
    expect(await backupStaleSince(f.prisma, now)).toBeNull();

    const old = new Date(now.getTime() - 37 * HOUR);
    await markBackup(old);
    expect(await backupStaleSince(f.prisma, now)).toBe(old.toISOString());
    const d = (await f.call("GET", "/admin/dashboard", f.teacher)).json() as AdminDashboard;
    expect(d.todo.backupStaleSince).toBe(old.toISOString());
  });
});
