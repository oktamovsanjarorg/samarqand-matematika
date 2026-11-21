import type { BillingView, MyPayment } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { compressImage, imageInit } from "./image";

/** O'quvchining o'z sahifasi yoki ota-onaning farzand uchun sahifasi (T-121) */
export const billingBase = (studentId?: string) =>
  studentId ? `/me/children/${studentId}/billing` : "/billing";

export const useBilling = (base: string) =>
  useQuery({ queryKey: ["billing", base], queryFn: () => api<BillingView>(base), staleTime: 0 });

export function useSubmitReceipt(base: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { planId: string; file: File; note: string }) => {
      const body = await compressImage(p.file);
      const q = new URLSearchParams({ planId: p.planId, ...(p.note.trim() ? { note: p.note.trim() } : {}) });
      return api<MyPayment>(`${base}/payments?${q}`, imageInit("POST", body));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing", base] }),
  });
}

export function useCancelPayment(base: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<null>(`${base}/payments/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing", base] }),
  });
}

const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Tashkent",
});
export const formatDate = (iso: string) => DAY.format(new Date(iso)).replace(/\//g, ".");
