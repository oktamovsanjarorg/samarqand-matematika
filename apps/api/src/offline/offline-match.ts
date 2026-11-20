import { phoneKey, type OfflineCsvRow, type OfflinePreviewRow } from "@samarqand/shared";

export interface Candidate {
  id: string;
  name: string;
  phone: string | null;
  inGroup: boolean;
}

/** Ismni solishtirish uchun: kichik harf, apostrof turlari va ortiqcha bo'shliqsiz */
export const nameKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ʻʼ'`’‘]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Bir xil kalitli yagona nomzod; guruh a'zolari ustun turadi */
function unique(list: Candidate[]): Candidate | null {
  const group = list.filter((c) => c.inGroup);
  const pool = group.length ? group : list;
  return pool.length === 1 ? (pool[0] ?? null) : null;
}

/**
 * CSV qatorlarini o'quvchilarga moslaydi (T-056): avval telefon, keyin aniq ism.
 * Bitta o'quvchi ikki qatorga biriktirilmaydi; noaniq bo'lsa moslanmaydi (ustoz qo'lda tanlaydi).
 */
export function matchRows(rows: OfflineCsvRow[], candidates: Candidate[]): OfflinePreviewRow[] {
  const byPhone = new Map<string, Candidate[]>();
  const byName = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const p = phoneKey(c.phone);
    if (p) byPhone.set(p, [...(byPhone.get(p) ?? []), c]);
    const n = nameKey(c.name);
    if (n) byName.set(n, [...(byName.get(n) ?? []), c]);
  }
  const used = new Set<string>();
  return rows.map((row) => {
    const p = phoneKey(row.phone);
    const viaPhone = p ? unique(byPhone.get(p) ?? []) : null;
    const viaName = viaPhone ? null : unique(byName.get(nameKey(row.name)) ?? []);
    const hit = viaPhone ?? viaName;
    if (!hit || used.has(hit.id)) return { ...row, match: null };
    used.add(hit.id);
    return { ...row, match: { userId: hit.id, name: hit.name, by: viaPhone ? "phone" : "name" } };
  });
}
