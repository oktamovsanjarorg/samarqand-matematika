import type { AdminStudentRow, StudentFilter } from "@samarqand/shared";
import { csvPhone, csvTime, downloadCsv } from "./download";
import { ACCESS_LABELS } from "./labels";

const FILE: Record<StudentFilter, string> = {
  new: "Yangi oʻquvchilar",
  unpaid: "Toʻlamagan oʻquvchilar",
  all: "Oʻquvchilar",
};

/** O'quvchilar ro'yxati Excel'ga (T-078): ekrandagi filtr va qidiruv bo'yicha */
export function exportStudents(rows: AdminStudentRow[], filter: StudentFilter) {
  downloadCsv(FILE[filter], [
    [
      "Ism",
      "Telegram",
      "Telefon",
      "Guruh",
      "Kirish",
      "Obuna tugashi",
      "Qabul qilingan",
      "Roʻyxatdan oʻtgan",
      "Oxirgi faollik",
    ],
    ...rows.map((s) => [
      s.fullName ?? s.telegramName,
      s.username ? `@${s.username}` : null,
      csvPhone(s.phone),
      s.groupName,
      ACCESS_LABELS[s.accessMode],
      csvTime(s.paidUntil),
      csvTime(s.acceptedAt),
      csvTime(s.createdAt),
      csvTime(s.lastSeenAt),
    ]),
  ]);
}
