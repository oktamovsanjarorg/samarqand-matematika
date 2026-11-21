export { ATTENDANCE_LABELS } from "@samarqand/shared";
import type { AdminGroupDetail, AdminGroupRow } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export const useGroups = () =>
  useQuery({ queryKey: ["groups"], queryFn: () => api.get<AdminGroupRow[]>("/admin/groups") });

export const useGroup = (id: string) =>
  useQuery({ queryKey: ["groups", id], queryFn: () => api.get<AdminGroupDetail>(`/admin/groups/${id}`) });

/** Toshkent bo'yicha bugungi sana "YYYY-MM-DD" */
export const tashkentToday = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(now);
