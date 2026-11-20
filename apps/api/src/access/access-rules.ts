import type { StudentAccess } from "@samarqand/shared";

export interface AccessFacts {
  mode: StudentAccess;
  accepted: boolean;
  approvedParents: number;
  paid: boolean;
}

/**
 * To'liq kirish (BR-A04): ustoz qabul qilgan + ota-ona tasdiqlagan + to'lov qilingan.
 * Ustoz qo'lda FREE qilsa shartlarsiz ochiq, CLOSED qilsa shartlar bajarilsa ham yopiq.
 */
export function isFullAccess(f: AccessFacts): boolean {
  if (f.mode !== "AUTO") return f.mode === "FREE";
  return f.accepted && f.approvedParents > 0 && f.paid;
}
