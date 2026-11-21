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
