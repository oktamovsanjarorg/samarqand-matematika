import { MAX_RECEIPT_BYTES, type BillingView, type MyPayment } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export const useBilling = () =>
  useQuery({ queryKey: ["billing"], queryFn: () => api<BillingView>("/billing"), staleTime: 0 });

const MAX_SIDE = 1600;

/**
 * Telefon rasmi katta bo'ladi: chek o'qilishi uchun 1600px yetarli. JPEG'ga siqiladi (BR-B02, 5 MB chegara).
 * Brauzer siqa olmasa va asl fayl chegaradan kichik bo'lsa, o'zi yuboriladi.
 */
export async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (blob && blob.size <= MAX_RECEIPT_BYTES) return blob;
  } catch {
    // pastda asl fayl tekshiriladi
  }
  if (file.size <= MAX_RECEIPT_BYTES) return file;
  throw new Error("Rasm juda katta. Boshqa rasm tanlang");
}

export function useSubmitReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { planId: string; file: File; note: string }) => {
      const body = await compressImage(p.file);
      const q = new URLSearchParams({ planId: p.planId, ...(p.note.trim() ? { note: p.note.trim() } : {}) });
      return api<MyPayment>(`/billing/payments?${q}`, {
        method: "POST",
        body,
        headers: { "Content-Type": body.type || "image/jpeg" },
      });
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
