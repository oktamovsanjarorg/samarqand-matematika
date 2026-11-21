import { z } from "zod";
import type { RoleName } from "./roles";

/** Jurnal bo'limlari (T-075): har biri qaysi audit obyektlarini o'z ichiga oladi */
export const AUDIT_SECTIONS = {
  content: { label: "Kontent", entities: ["Course", "Topic", "Lesson", "Question"] },
  tests: {
    label: "Testlar",
    entities: ["WeeklyTest", "WeeklyAttempt", "MockTest", "ExamTemplate", "OfflineTest"],
  },
  people: { label: "Odamlar", entities: ["User", "Group", "ParentLink"] },
  billing: { label: "Toʻlovlar", entities: ["Payment", "Plan", "AppSetting"] },
} as const;
export type AuditSection = keyof typeof AUDIT_SECTIONS;
const SECTION_KEYS = Object.keys(AUDIT_SECTIONS) as [AuditSection, ...AuditSection[]];

export const auditQuery = z.object({
  section: z.enum(SECTION_KEYS).optional(),
  actorId: z.string().min(1).max(40).optional(),
  cursor: z.string().min(1).max(40).optional(),
});
export type AuditQuery = z.infer<typeof auditQuery>;

/** Amal nomlari (foydalanuvchi ko'radi); ro'yxatda yo'q amal o'z kodi bilan chiqadi */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "admin.login": "Admin panelga kirdi",
  "attendance.mark": "Davomat belgiladi",
  "billing.card": "Toʻlov kartasini oʻzgartirdi",
  "course.create": "Kurs yaratdi",
  "course.update": "Kursni tahrirladi",
  "course.delete": "Kursni oʻchirdi",
  "topic.create": "Mavzu yaratdi",
  "topic.update": "Mavzuni tahrirladi",
  "topic.delete": "Mavzuni oʻchirdi",
  "lesson.create": "Dars yaratdi",
  "lesson.update": "Darsni tahrirladi",
  "lesson.delete": "Darsni oʻchirdi",
  "question.create": "Savol qoʻshdi",
  "question.update": "Savolni tahrirladi",
  "question.delete": "Savolni oʻchirdi",
  "trash.restore": "Axlat qutisidan tikladi",
  "group.create": "Guruh yaratdi",
  "group.update": "Guruhni tahrirladi",
  "group.add": "Guruhga oʻquvchi qoʻshdi",
  "group.remove": "Guruhdan oʻquvchi chiqardi",
  "student.accept": "Oʻquvchini qabul qildi",
  "staff.add": "Yordamchi tayinladi",
  "lesson.announce": "Yangi dars haqida xabar yubordi",
  "staff.remove": "Yordamchini olib tashladi",
  "student.update": "Oʻquvchi kirishini oʻzgartirdi",
  "parent.approve": "Ota-onani tasdiqladi",
  "parent.reject": "Ota-onani rad etdi",
  "payment.approve": "Toʻlovni tasdiqladi",
  "payment.reject": "Toʻlovni rad etdi",
  "plan.create": "Tarif yaratdi",
  "plan.update": "Tarifni tahrirladi",
  "weekly.create": "Haftalik test yaratdi",
  "weekly.update": "Haftalik testni tahrirladi",
  "weekly.delete": "Haftalik testni oʻchirdi",
  "weekly.grade": "Haftalik javobni baholadi",
  "mock.create": "Mock yaratdi",
  "mock.update": "Mockni tahrirladi",
  "mock.delete": "Mockni oʻchirdi",
  "exam-template.create": "Imtihon shablonini yaratdi",
  "exam-template.update": "Imtihon shablonini tahrirladi",
  "exam-template.active": "Faol shablonni almashtirdi",
  "offline.import": "Offline natijalarni yukladi",
  "offline.match": "Offline qatorni oʻquvchiga bogʻladi",
  "offline.delete": "Offline testni oʻchirdi",
};

export interface AuditActor {
  id: string;
  name: string;
  role: RoleName;
}

export interface AuditRow {
  id: string;
  at: string;
  actor: AuditActor | null;
  action: string;
  entity: string;
  entityId: string | null;
  /** Obyekt nomi (kurs, dars, o'quvchi ...); o'chirilgan yoki nomsiz bo'lsa null */
  target: string | null;
}

export interface AuditPage {
  rows: AuditRow[];
  /** Keyingi sahifa uchun; oxirgi sahifada null */
  next: string | null;
  /** Filtr uchun: jurnalda uchraydigan xodimlar */
  actors: AuditActor[];
}
