import type { WeeklyOpen } from "@samarqand/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, apiBlob } from "./api";
import { compressImage, imageInit } from "./image";

/** Yechim rasmlari: savol → rasm id'lari. Yuklash va o'chirish serverda tasdiqlangach ro'yxat yangilanadi */
export function usePhotos(attempt: WeeklyOpen) {
  const [map, setMap] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(attempt.questions.map((q) => [q.question.id, q.photos])),
  );
  const add = useMutation({
    mutationFn: async (p: { qid: string; file: File }) => {
      const body = await compressImage(p.file);
      const r = await api<{ id: string }>(
        `/weekly-attempts/${attempt.id}/answers/${p.qid}/photos`,
        imageInit("POST", body),
      );
      return { qid: p.qid, id: r.id };
    },
    onSuccess: ({ qid, id }) => setMap((m) => ({ ...m, [qid]: [...(m[qid] ?? []), id] })),
  });
  const remove = useMutation({
    mutationFn: async (p: { qid: string; id: string }) => {
      await api<null>(`/weekly-attempts/${attempt.id}/photos/${p.id}`, { method: "DELETE" });
      return p;
    },
    onSuccess: ({ qid, id }) => setMap((m) => ({ ...m, [qid]: (m[qid] ?? []).filter((x) => x !== id) })),
  });
  const missing = attempt.questions.filter((q) => (map[q.question.id] ?? []).length === 0).length;
  return { map, add, remove, missing };
}

export type Photos = ReturnType<typeof usePhotos>;

/** Rasm ko'rinishi uchun blob URL (token bilan yuklanadi, sahifadan chiqqanda bo'shatiladi) */
export function usePhotoUrl(id: string) {
  const blob = useQuery({
    queryKey: ["photo", id],
    queryFn: () => apiBlob(`/weekly-photos/${id}`),
    staleTime: Infinity,
  });
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob.data) return;
    const u = URL.createObjectURL(blob.data);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob.data]);
  return url;
}
