import { z } from "zod";

/** Chek rasmi: faqat shu turlar, 5 MB gacha (BR-B02) */
export const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export const PAYMENT_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** 150000 → "150 000" */
export const formatSum = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export const planInput = z.object({
  name: z.string().trim().min(2, "Nom kamida 2 belgi").max(80),
  priceUzs: z.int().min(1000, "Narx kamida 1 000 soʻm").max(100_000_000),
  durationDays: z.int().min(1).max(366),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});
export type PlanInput = z.infer<typeof planInput>;

/** Karta raqami bo'sh joylarsiz 16 xona. Bazada turadi, repoda emas */
export const cardInput = z.object({
  number: z
    .string()
    .transform((s) => s.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^\d{16}$/, "Karta raqami 16 ta raqam")),
  holder: z.string().trim().min(2, "Karta egasining ismi kerak").max(80),
});
export type BillingCard = z.infer<typeof cardInput>;

export const payerNote = z.string().trim().max(300).optional();
export const rejectPaymentBody = z.object({ reason: z.string().trim().min(3, "Sababni yozing").max(300) });

export interface PlanView {
  id: string;
  name: string;
  priceUzs: number;
  durationDays: number;
  description: string | null;
}

export interface AdminPlan extends PlanView {
  isActive: boolean;
  /** Hozir shu tarifda faol obunalar */
  activeCount: number;
}

export interface MyPayment {
  id: string;
  planName: string;
  amountUzs: number;
  status: PaymentStatus;
  reviewNote: string | null;
  createdAt: string;
  /** Chekni ota-ona yuborgan (T-120) */
  byParent: boolean;
}

/** O'quvchining "To'lov" sahifasi */
export interface BillingView {
  plans: PlanView[];
  card: BillingCard | null;
  subscription: { endsAt: string } | null;
  payments: MyPayment[];
}

export interface AdminPayment extends MyPayment {
  student: { id: string; name: string; username: string | null; phone: string | null };
  payerNote: string | null;
  /** O'quvchining hozirgi obunasi tugash vaqti */
  activeUntil: string | null;
  /** Chekni yuborgan ota-ona ismi (T-120); null: o'quvchining o'zi */
  submittedBy: string | null;
  /** Aynan shu rasm avval yuborilgan bo'lsa, eng birinchisi (T-124) */
  duplicateOf: { student: string; createdAt: string } | null;
}

/** Oylik tushum (T-109): "YYYY-MM", Toshkent vaqti bo'yicha tasdiqlangan to'lovlar */
export const incomeMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Oy YYYY-MM koʻrinishida");

export interface IncomeMonth {
  month: string;
  count: number;
  sumUzs: number;
  byPlan: { name: string; count: number; sumUzs: number }[];
  /** Excel uchun: tasdiqlangan to'lovlar, eski birinchi */
  rows: { student: string; plan: string; amountUzs: number; approvedAt: string }[];
}
