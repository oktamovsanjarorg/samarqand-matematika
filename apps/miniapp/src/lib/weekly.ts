import type { StudentWeeklyRow, WeeklyAttemptView } from "@samarqand/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../store/auth";
import { api, post } from "./api";

/** Haftalik testlar ro'yxati: faqat o'quvchida (ota-onaga yopiq) */
export function useWeeklyList() {
  const isStudent = useAuth((s) => s.user?.role === "STUDENT");
  return useQuery({
    queryKey: ["weekly"],
    queryFn: () => api<StudentWeeklyRow[]>("/weekly"),
    enabled: isStudent,
    staleTime: 0,
  });
}

/** Testni ochish: server mavjud urinishni qaytaradi yoki yangisini boshlaydi */
export const weeklyKey = (testId: string) => ["weekly-test", testId];

export function useWeeklySubmit(testId: string) {
  const qc = useQueryClient();
  return (attemptId: string) => async (flush: () => Promise<void>) => {
    await flush();
    const v = await post<WeeklyAttemptView>(`/weekly-attempts/${attemptId}/submit`);
    qc.setQueryData(weeklyKey(testId), v);
    void qc.invalidateQueries({ queryKey: ["weekly"] });
  };
}
