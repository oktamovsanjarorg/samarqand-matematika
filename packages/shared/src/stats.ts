/** Natija foizi: avtomatik tekshirilganlar ichida to'g'rilari. Tekshiriladigan savol bo'lmasa null */
export const percentOf = (correct: number, checkable: number): number | null =>
  checkable > 0 ? Math.round((correct / checkable) * 100) : null;

export interface AttemptSummary {
  id: string;
  topicId: string;
  topicTitle: string;
  correct: number;
  checkable: number;
  submittedAt: string;
}

/** O'quvchining mavzu testlari bo'yicha statistikasi (Asosiy va Profil) */
export interface MyStats {
  /** Tugallanmagan test: "Davom etish" */
  open: {
    attemptId: string;
    topicId: string;
    topicTitle: string;
    answered: number;
    total: number;
    /** Xatolar ustida ishlash urinishi (T-104) */
    mistakes: boolean;
  } | null;
  /** Topshirilgan testlar soni */
  tests: number;
  /** Topshirilgan testlar o'rtacha foizi (har urinish teng og'irlikda) */
  averagePercent: number | null;
  /** Oxirgi 5 ta natija */
  recent: AttemptSummary[];
  /** Mavzular: urinishlar soni va eng yaxshi foiz, eng yaxshisi pastroq mavzu birinchi */
  topics: { topicId: string; topicTitle: string; attempts: number; bestPercent: number | null }[];
}
