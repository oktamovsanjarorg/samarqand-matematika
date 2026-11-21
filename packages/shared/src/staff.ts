import { z } from "zod";

/** Xodim: ustoz (egasi, .env dagi OWNER_*) yoki yordamchi (T-086) */
export interface StaffRow {
  id: string;
  name: string;
  username: string | null;
  role: "TEACHER" | "ASSISTANT";
  lastSeenAt: string | null;
}

export const staffAdd = z.object({ userId: z.string().min(1) });
export type StaffAdd = z.infer<typeof staffAdd>;
