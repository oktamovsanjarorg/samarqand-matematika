/** Axlat qutisi (T-099, FR-U05): o'chirilgan kontent shuncha kun tiklanadi */
export const TRASH_DAYS = 30;

export const TRASH_ENTITIES = ["Course", "Topic", "Lesson", "Question"] as const;
export type TrashEntity = (typeof TRASH_ENTITIES)[number];

export const TRASH_LABELS: Record<TrashEntity, string> = {
  Course: "Kurs",
  Topic: "Mavzu",
  Lesson: "Dars",
  Question: "Savol",
};

export interface TrashRow {
  id: string;
  entity: TrashEntity;
  title: string;
  /** Qayerda edi: kurs yoki "Kurs · Mavzu"; ota ham o'chirilgan bo'lsa null */
  place: string | null;
  deletedAt: string;
  deletedBy: string | null;
  /** Shu vaqtdan keyin butunlay o'chadi */
  expiresAt: string;
}
