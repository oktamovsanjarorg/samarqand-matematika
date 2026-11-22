import { Injectable } from "@nestjs/common";

export interface AiFailure {
  since: Date;
  /** HTTP status; 0: tarmoq xatosi */
  status: number;
}

/** Xato statusidan ustozga tushunarli sabab (T-163). Provayder xato matni ko'rsatilmaydi */
export function aiErrorText(status: number): string {
  if (status === 402) return "AI hisobida mablagʻ tugagan: hisobni toʻldirish kerak";
  if (status === 401 || status === 403) return "AI kaliti notoʻgʻri yoki bekor qilingan";
  return "AI hozir javob bermayapti, birozdan keyin urinib koʻring";
}

/** Xatodan status: DeepSeekError va Anthropic APIError ikkalasida `status` bor */
export const statusOf = (e: unknown): number => {
  const s = (e as { status?: unknown } | null)?.status;
  return typeof s === "number" ? s : 0;
};

/**
 * AI xizmati holati (T-163): oxirgi chaqiruv xato bo'lsa, qachondan beri va qaysi status.
 * Xotirada: API qayta ishga tushsa tozalanadi, birinchi muvaffaqiyatli javob ham tozalaydi.
 */
@Injectable()
export class AiHealth {
  private failure: AiFailure | null = null;

  ok(): void {
    this.failure = null;
  }

  fail(status: number, now = new Date()): void {
    this.failure = { since: this.failure?.since ?? now, status };
  }

  get(): AiFailure | null {
    return this.failure;
  }
}
