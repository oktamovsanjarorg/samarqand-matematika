import type { AdminStudentRow } from "@samarqand/shared";
import { csvPhone, csvTime, downloadCsv } from "./download";
import { ACCESS_LABELS } from "./labels";

/** O'quvchilar ro'yxati Excel'ga (T-078): ekrandagi filtr va qidiruv bo'yicha */
export function exportStudents(rows: AdminStudentRow[], all: boolean) {
  downloadCsv(all ? "Oʻquvchilar" : "Yangi oʻquvchilar", [
    [
      "Ism",
      "Telegram",
      "Telefon",
      "Guruh",
      "Kirish",
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
      csvTime(s.acceptedAt),
      csvTime(s.createdAt),
      csvTime(s.lastSeenAt),
    ]),
  ]);
}
