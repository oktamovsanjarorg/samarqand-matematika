/**
 * O'quvchi ro'yxati konstantalari. Zod'siz alohida modul (T-172): bosh sahifa faqat shu sonlarni
 * ishlatadi va zod kutubxonasi asosiy faylga tushmaydi.
 */
export const STUDENT_ACCESS = ["AUTO", "FREE", "CLOSED"] as const;

/** O'quvchilar ro'yxati filtri: yangi, hammasi, to'lamagan (qabul qilingan, AUTO, faol obunasiz; T-110) */
export const STUDENT_FILTERS = ["new", "all", "unpaid", "expiring"] as const;
/** "expiring": faol obunasi shu kun ichida tugaydi va uzaytirilmagan (T-127) */
export const EXPIRING_DAYS = 7;
export type StudentFilter = (typeof STUDENT_FILTERS)[number];
export type StudentAccess = (typeof STUDENT_ACCESS)[number];
