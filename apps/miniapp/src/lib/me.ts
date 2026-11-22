import type { Mistake, MyProfile, MyProgress, MySchool, MyStats } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../store/auth";
import { api } from "./api";

export const useProfile = () =>
  useQuery({ queryKey: ["profile"], queryFn: () => api<MyProfile>("/me/profile") });

/** Statistika faqat o'quvchida bor; har ochilishda yangilanadi (test topshirilgandan keyin) */
export function useStats() {
  const isStudent = useAuth((s) => s.user?.role === "STUDENT");
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => api<MyStats>("/me/stats"),
    enabled: isStudent,
    staleTime: 0,
  });
}

/** Yutuqlar (T-169): seriya, 7 kun, nishonlar; test topshirilgach yangilanadi */
export function useProgress() {
  const isStudent = useAuth((s) => s.user?.role === "STUDENT");
  return useQuery({
    queryKey: ["progress"],
    queryFn: () => api<MyProgress>("/me/progress"),
    enabled: isStudent,
    staleTime: 0,
  });
}

/** Guruh, ota-ona holati, davomat: faqat o'quvchida (T-065) */
/** Xatolarim (T-079): test topshirilgach yangilanadi */
export function useMistakes() {
  const isStudent = useAuth((s) => s.user?.role === "STUDENT");
  return useQuery({
    queryKey: ["mistakes"],
    queryFn: () => api<Mistake[]>("/me/mistakes"),
    enabled: isStudent,
    staleTime: 0,
  });
}

export function useSchool() {
  const isStudent = useAuth((s) => s.user?.role === "STUDENT");
  return useQuery({ queryKey: ["school"], queryFn: () => api<MySchool>("/me/school"), enabled: isStudent });
}

const DAY = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", timeZone: "Asia/Tashkent" });

/** "20.11" (Toshkent vaqti bilan). uz-UZ locale brauzerlarda turlicha chiqadi, shuning uchun qismlardan yig'iladi */
export function formatDay(iso: string): string {
  const parts = Object.fromEntries(DAY.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.day}.${parts.month}`;
}
