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

export const ATTENDANCE_STATUSES = ["PRESENT", "LATE", "ABSENT", "EXCUSED"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_LABELS = {
  PRESENT: "Keldi",
  LATE: "Kechikdi",
  ABSENT: "Kelmadi",
  EXCUSED: "Sababli",
} as const satisfies Record<AttendanceStatus, string>;

/** Toshkent sanasi "YYYY-MM-DD" */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana YYYY-MM-DD koʻrinishida");

/** Davomat (T-055): guruh va kun bo'yicha belgilash */
export const attendanceBody = z.object({
  date: isoDate,
  marks: z
    .array(
      z.object({
        userId: z.string().min(1),
        status: z.enum(ATTENDANCE_STATUSES),
        note: z.string().trim().max(200).nullable().optional(),
      }),
    )
    .min(1)
    .max(200),
});
export type AttendanceBody = z.infer<typeof attendanceBody>;

/** Oylik davomat (T-108): "YYYY-MM" */
export const attendanceMonthQuery = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Oy YYYY-MM koʻrinishida");

export interface AttendanceMonth {
  month: string;
  /** Kamida bitta belgi qo'yilgan kunlar, o'sish tartibida */
  dates: string[];
  rows: {
    userId: string;
    name: string;
    /** Guruhda hozir yo'q, lekin shu oyda belgisi bor */
    left: boolean;
    marks: Record<string, AttendanceStatus>;
    counts: Record<AttendanceStatus, number>;
  }[];
}

export interface AttendanceSheet {
  date: string;
  rows: { userId: string; name: string; status: AttendanceStatus | null; note: string | null }[];
}
