/** Admin bosh sahifa (T-061): ustozni kutayotgan ishlar va qisqa holat */
export interface AdminDashboard {
  todo: {
    newStudents: number;
    pendingParents: number;
    pendingPayments: number;
    unmatchedOffline: number;
    /** Yopilgan haftalik testlarda ustoz hali ko'rmagan yechim rasmlari */
    review: { testId: string; title: string; count: number }[];
  };
  stats: {
    students: number;
    activeToday: number;
    activeWeek: number;
    groups: number;
    /** Bugun davomat belgilangan guruhlar */
    groupsMarkedToday: number;
    /** Muvaffaqiyat o'lchovlari (T-105, 00-vision) */
    /** Oxirgi yopilgan haftalik test: topshirganlar va hozir to'liq kirishli o'quvchilar soni */
    lastWeekly: { testId: string; title: string; submitted: number; eligible: number } | null;
    /** Kamida bitta tasdiqlangan ota-onasi bor o'quvchilar */
    parentsLinked: number;
    /** Oxirgi 30 kunda mavzu testini qayta ishlash: nechtasida natija oshdi (T-133, 00-vision) */
    retries: { count: number; improved: number };
    /** Obunasi EXPIRING_DAYS kun ichida tugaydigan, uzaytirmagan o'quvchilar (T-127) */
    expiringSoon: number;
  };
}

/** Menyu belgilari uchun: bo'lim → kutayotgan ishlar soni */
export const dashboardBadges = (d: AdminDashboard): Record<string, number> => ({
  "/students": d.todo.newStudents,
  "/parents": d.todo.pendingParents,
  "/payments": d.todo.pendingPayments,
  "/offline": d.todo.unmatchedOffline,
  "/weekly": d.todo.review.reduce((s, r) => s + r.count, 0),
});
