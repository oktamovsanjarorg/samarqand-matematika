import type { ChildView } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

/** Ota-onaning farzandlari (tasdiqlangan va kutilayotgan) */
export const useChildren = () =>
  useQuery({ queryKey: ["children"], queryFn: () => api<ChildView[]>("/me/children") });
