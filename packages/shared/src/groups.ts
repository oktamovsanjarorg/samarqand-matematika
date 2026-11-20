import { z } from "zod";

/** Offline guruh (T-054): o'quvchi bitta guruhda bo'ladi */
export const groupInput = z.object({
  name: z.string().trim().min(2, "Nom kamida 2 belgi").max(80),
  /** Masalan: "Du/Chor/Ju 14:00" */
  schedule: z.string().trim().max(120).nullable().optional(),
});
export type GroupInput = z.infer<typeof groupInput>;

export const groupPatch = groupInput
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, "Oʻzgartirish yoʻq");
export type GroupPatch = z.infer<typeof groupPatch>;

export const groupMembersBody = z.object({ userIds: z.array(z.string().min(1)).min(1).max(100) });

export interface AdminGroupRow {
  id: string;
  name: string;
  schedule: string | null;
  isActive: boolean;
  studentCount: number;
}

export interface GroupStudent {
  id: string;
  name: string;
  phone: string | null;
}

export interface AdminGroupDetail extends AdminGroupRow {
  students: GroupStudent[];
}
