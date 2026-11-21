import type { Logger } from "@nestjs/common";

/**
 * Davriy ish (T-136). Oldingi tick tugamaguncha yangisi boshlanmaydi: uzun AI tekshiruvi yoki
 * ko'p xabar yuborish ustma-ust tushib, xabar takrorlanmaydi. To'xtatishda (deploy, SIGTERM)
 * boshlangan tick oxirigacha bajariladi: xabarlar yarmida uzilib, keyin qayta yuborilmaydi.
 */
export class Ticker {
  private timer?: NodeJS.Timeout;
  private running: Promise<void> | null = null;

  constructor(private readonly log: Logger) {}

  /** seconds = 0: o'chiq (testlar tick'ni o'zi chaqiradi) */
  start(seconds: number, tick: () => Promise<unknown>): void {
    if (seconds === 0) return;
    this.timer = setInterval(() => {
      if (this.running) return;
      this.running = tick()
        .then(() => undefined)
        .catch((e: unknown) => this.log.warn(`tick: ${e instanceof Error ? e.name : "xato"}`))
        .finally(() => {
          this.running = null;
        });
    }, seconds * 1000);
  }

  async stop(): Promise<void> {
    clearInterval(this.timer);
    await this.running;
  }
}
