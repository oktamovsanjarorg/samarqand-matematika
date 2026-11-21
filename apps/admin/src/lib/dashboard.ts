import type { AdminDashboard } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

/** Bosh sahifa va menyu belgilari: daqiqada bir yangilanadi */
export const useDashboard = () =>
  useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<AdminDashboard>("/admin/dashboard"),
    refetchInterval: 60_000,
  });
