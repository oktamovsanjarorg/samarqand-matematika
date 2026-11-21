import type { AdminOfflineTestDetail, AdminOfflineTestRow } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export const useOfflineTests = () =>
  useQuery({ queryKey: ["offline"], queryFn: () => api.get<AdminOfflineTestRow[]>("/admin/offline-tests") });

export const useOfflineTest = (id: string) =>
  useQuery({
    queryKey: ["offline", id],
    queryFn: () => api.get<AdminOfflineTestDetail>(`/admin/offline-tests/${id}`),
  });

/** Ball: butun bo'lsa butun, aks holda vergul bilan */
export const fmtScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

/** Vaqtsiz sana "YYYY-MM-DD" → "DD.MM.YYYY" */
export const fmtDay = (d: string) => d.split("-").reverse().join(".");
