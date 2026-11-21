import type { StudentOfflineResult } from "./offline";
import type { MySchool } from "./profile";
import type { AttemptSummary } from "./stats";
import { z } from "zod";
import { telegramProfileSchema } from "./telegram-profile";

/** Ota-ona kodi: 8 ta katta harfli hex (t.me/<bot>?start=p_<kod>) */
export const PARENT_CODE_RE = /^[0-9A-F]{8}$/;
/** Bitta o'quvchiga ulanishi mumkin bo'lgan faol (kutilayotgan yoki tasdiqlangan) ota-onalar */
export const MAX_PARENTS = 2;

const contact = z.object({ phone_number: z.string().min(5).max(20), user_id: z.number().int().optional() });

/** Bot: o'quvchi /ota buyrug'ini yubordi */
export const parentCodeBody = z.object({ from: telegramProfileSchema });

/** Bot: ota-ona havola orqali kirib, o'z raqamini ulashdi */
export const parentLinkBody = z.object({
  code: z.string().toUpperCase().regex(PARENT_CODE_RE),
  from: telegramProfileSchema,
  contact,
});
export type ParentLinkBody = z.infer<typeof parentLinkBody>;

export type ParentLinkResult =
  | { status: "created" | "exists"; studentName: string }
  | { status: "invalid_code" | "not_own_contact" | "self" | "limit" | "rejected_before" | "is_student" };

export const PARENT_LINK_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ParentLinkStatus = (typeof PARENT_LINK_STATUSES)[number];

export const rejectParentBody = z.object({ reason: z.string().trim().min(3, "Sababini yozing").max(300) });

/** Ustoz ko'radigan shubha belgilari */
export const PARENT_FLAGS = {
  same_phone: "Raqami oʻquvchi raqami bilan bir xil",
  parent_activity: "Bu hisob ilovada test ishlagan: oʻquvchining oʻzi boʻlishi mumkin",
  many_children: "Koʻp oʻquvchiga ulanmoqda",
} as const;
export type ParentFlag = keyof typeof PARENT_FLAGS;

export interface AdminParentLink {
  id: string;
  status: ParentLinkStatus;
  phone: string;
  flags: ParentFlag[];
  parentName: string;
  parentUsername: string | null;
  studentId: string;
  studentName: string;
  createdAt: string;
  reviewedAt: string | null;
  rejectReason: string | null;
}

/** Ota-onaning farzandi: tasdiqlangan yoki ustoz tasdig'ini kutayotgan ulanish (T-070) */
export interface ChildView {
  studentId: string;
  name: string;
  status: "APPROVED" | "PENDING";
}

/** Ota-ona kabineti: farzandning yopilgan haftalik natijasi (T-069) */
export interface ChildWeeklyRow {
  id: string;
  title: string;
  closesAt: string;
  total: number;
  submitted: boolean;
  score: number;
  /** Shu test reytingidagi o'rin (T-070); topshirmagan bo'lsa null */
  place: number | null;
  participants: number;
}

/** Ota-ona kabineti: faqat faktlar, AI shubhasisiz (BR-PA01) */
export interface ChildSummary {
  /** To'liq kirish qadamlari (BR-A04) va faol obuna tugash sanasi (T-070) */
  access: {
    full: boolean;
    accepted: boolean;
    parentApproved: boolean;
    paid: boolean;
    paidUntil: string | null;
  };
  tests: number;
  averagePercent: number | null;
  recent: AttemptSummary[];
  group: MySchool["group"];
  attendance: MySchool["attendance"];
  weekly: ChildWeeklyRow[];
  offline: StudentOfflineResult[];
  weak: { topicTitle: string; percent: number; total: number }[];
}
