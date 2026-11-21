import type { AuditPage, AuditRow, AuditSection } from "@samarqand/shared";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "./api";

export interface AuditFilter {
  section: AuditSection | "";
  actorId: string;
}

/** Jurnal (T-075): 50 tadan, "Yana" bilan keyingi sahifa */
export const useAudit = (f: AuditFilter) =>
  useInfiniteQuery({
    queryKey: ["audit", f],
    initialPageParam: "",
    queryFn: ({ pageParam }) => {
      const q = new URLSearchParams();
      if (f.section) q.set("section", f.section);
      if (f.actorId) q.set("actorId", f.actorId);
      if (pageParam) q.set("cursor", pageParam);
      return api.get<AuditPage>(`/admin/audit?${q.toString()}`);
    },
    getNextPageParam: (last) => last.next ?? undefined,
  });

const LINKS: Record<string, (id: string) => string> = {
  Lesson: (id) => `/content/lessons/${id}`,
  Question: (id) => `/content/questions/${id}`,
  WeeklyTest: (id) => `/weekly/${id}`,
  MockTest: (id) => `/mocks/${id}`,
  Group: (id) => `/groups/${id}`,
  OfflineTest: (id) => `/offline/${id}`,
};

/** Obyekt sahifasi (bor bo'lsa): o'chirilgan obyektga havola berilmaydi */
export function auditLink(r: AuditRow): string | null {
  if (!r.entityId || !r.target) return null;
  if (r.entity === "User") return r.action.startsWith("student.") ? `/students/${r.entityId}` : null;
  return LINKS[r.entity]?.(r.entityId) ?? null;
}
