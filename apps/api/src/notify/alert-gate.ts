const HOUR = 3_600_000;
const MAX_KEYS = 500;

/**
 * T-190: dasturchiga ogohlantirish shovqini cheklanadi: bir xil xato soatiga bir marta,
 * hammasi bo'lib soatiga `maxPerWindow` ta. Yuzlab o'quvchida bir xil xato chat'ni to'ldirmaydi.
 */
export class AlertGate {
  private readonly last = new Map<string, number>();
  private sent: number[] = [];

  constructor(
    private readonly windowMs = HOUR,
    private readonly maxPerWindow = 30,
  ) {}

  allow(key: string, now = Date.now()): boolean {
    this.sent = this.sent.filter((t) => now - t < this.windowMs);
    const prev = this.last.get(key);
    if (prev !== undefined && now - prev < this.windowMs) return false;
    if (this.sent.length >= this.maxPerWindow) return false;
    if (this.last.size >= MAX_KEYS) this.last.clear();
    this.last.set(key, now);
    this.sent.push(now);
    return true;
  }
}
