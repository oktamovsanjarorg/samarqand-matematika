import type { BillingView, MyPayment } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { compressImage, imageInit } from "./image";

export const useBilling = () =>
  useQuery({ queryKey: ["billing"], queryFn: () => api<BillingView>("/billing"), staleTime: 0 });

export function useSubmitReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { planId: string; file: File; note: string }) => {
      const body = await compressImage(p.file);
      const q = new URLSearchParams({ planId: p.planId, ...(p.note.trim() ? { note: p.note.trim() } : {}) });
      return api<MyPayment>(`/billing/payments?${q}`, imageInit("POST", body));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing"] }),
  });
}

export function useCancelPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<null>(`/billing/payments/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing"] }),
  });
}

const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Tashkent",
});
export const formatDate = (iso: string) => DAY.format(new Date(iso)).replace(/\//g, ".");
