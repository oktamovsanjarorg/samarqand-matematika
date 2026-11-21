import type { AttemptResult } from "./attempt";

/** Xatolarim (T-079): mavzu testida oxirgi marta xato ishlangan savol, to'g'ri javob va yechim bilan */
export interface Mistake {
  topicId: string;
  topicTitle: string;
  /** Oxirgi urinish vaqti */
  at: string;
  /** Necha marta xato ishlangan */
  times: number;
  item: AttemptResult["items"][number];
}

/** Ko'rsatiladigan eng ko'p xato soni: yangisi birinchi */
export const MISTAKES_LIMIT = 50;
