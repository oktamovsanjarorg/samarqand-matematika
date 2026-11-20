import type { AttemptResult, AttemptView } from "./attempt";
import type { WeeklyStatus } from "./weekly";

/** O'quvchi ro'yxati: ball va daraja faqat oyna yopilgach */
export interface StudentMockRow {
  id: string;
  title: string;
  opensAt: string;
  closesAt: string;
  status: WeeklyStatus;
  durationMin: number;
  questionCount: number;
  my: { started: boolean; submitted: boolean; scaled: number | null; grade: string | null };
}

export interface MockSectionInfo {
  title: string;
  count: number;
  /** Bitta savol bali */
  points: number;
}

/** Ochiq urinish: muddat server bo'yicha (shablon vaqti, oyna yopilishidan oshmaydi) */
export interface MockOpen {
  status: "OPEN";
  id: string;
  mockTestId: string;
  title: string;
  startedAt: string;
  deadline: string;
  sections: MockSectionInfo[];
  questions: (AttemptView["questions"][number] & { section: number })[];
}

/** Topshirilgan (yoki vaqt tugagan), oyna ochiq: natija yo'q */
export interface MockWaiting {
  status: "WAITING";
  id: string;
  title: string;
  submittedAt: string;
  closesAt: string;
}

export interface MockSectionResult {
  title: string;
  correct: number;
  total: number;
  raw: number;
  maxRaw: number;
}

/** Oyna yopilgach: xom ball, shkala balli (hozircha taxminiy, BR-M05), daraja, bo'limlar */
export interface MockResult {
  status: "RESULT";
  id: string;
  mockTestId: string;
  title: string;
  submittedAt: string | null;
  raw: number;
  maxRaw: number;
  scaled: number;
  scaleMax: number;
  grade: string | null;
  approx: boolean;
  sections: MockSectionResult[];
  items: (AttemptResult["items"][number] & { section: number; points: number })[];
}

export type MockAttemptView = MockOpen | MockWaiting | MockResult;
