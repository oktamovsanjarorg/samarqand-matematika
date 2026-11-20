import type { MockAttemptView, StudentMockRow } from "@samarqand/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../store/auth";
import { api, post } from "./api";

/** Mocklar ro'yxati: faqat o'quvchida */
export function useMockList() {
  const isStudent = useAuth((s) => s.user?.role === "STUDENT");
  return useQuery({
    queryKey: ["mocks"],
    queryFn: () => api<StudentMockRow[]>("/mocks"),
    enabled: isStudent,
    staleTime: 0,
  });
}

/** Mockni ochish: server mavjud urinishni qaytaradi yoki yangisini boshlaydi */
export const mockKey = (mockId: string) => ["mock-test", mockId];

export function useMockSubmit(mockId: string) {
  const qc = useQueryClient();
  return (attemptId: string) => async (flush: () => Promise<void>) => {
    await flush();
    const v = await post<MockAttemptView>(`/mock-attempts/${attemptId}/submit`);
    qc.setQueryData(mockKey(mockId), v);
    void qc.invalidateQueries({ queryKey: ["mocks"] });
  };
}
