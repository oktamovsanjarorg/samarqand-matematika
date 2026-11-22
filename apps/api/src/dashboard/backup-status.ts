import type { PrismaClient } from "@samarqand/db";

/** scripts/backup.sh muvaffaqiyatli tugaganda shu kalitning updatedAt'ini yangilaydi (T-145) */
export const BACKUP_KEY = "backup:last";
/** Kunlik zaxira: 36 soatdan ortiq yangilanmasa, cron ishlamay qolgan */
export const BACKUP_STALE_HOURS = 36;

/**
 * Oxirgi muvaffaqiyatli zaxira vaqti, agar u eskirgan bo'lsa (ISO); aks holda null.
 * Yozuv umuman bo'lmasa ham null: dev va hali birinchi zaxira olinmagan yangi o'rnatish.
 */
export async function backupStaleSince(
  prisma: Pick<PrismaClient, "appSetting">,
  now: Date,
): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: BACKUP_KEY }, select: { updatedAt: true } });
  if (!row) return null;
  const age = now.getTime() - row.updatedAt.getTime();
  return age > BACKUP_STALE_HOURS * 3_600_000 ? row.updatedAt.toISOString() : null;
}
