import type { AdminCourseTree, ReorderBody } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export const TREE_KEY = ["content-tree"];
export const useTree = () =>
  useQuery({ queryKey: TREE_KEY, queryFn: () => api.get<AdminCourseTree[]>("/admin/courses") });

/** Daraxtni o'zgartiradigan amal: muvaffaqiyatdan keyin daraxt qayta yuklanadi */
export function useTreeMutation<T>(fn: (arg: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: TREE_KEY }) });
}

/** Elementni ro'yxatda bir pog'ona yuqori (-1) yoki pastga (+1) suradi: API to'liq ro'yxatni kutadi */
export function moved(ids: string[], index: number, dir: -1 | 1): string[] | null {
  const to = index + dir;
  if (to < 0 || to >= ids.length) return null;
  const next = [...ids];
  [next[index], next[to]] = [next[to] as string, next[index] as string];
  return next;
}

export const reorder = (body: ReorderBody) => api.post("/admin/reorder", body);
