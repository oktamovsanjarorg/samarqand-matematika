import { describe, expect, it } from "vitest";
import { attentionReasons } from "../src/insights/attention";

const now = new Date("2026-11-21T10:00:00Z");
const ago = (days: number) => new Date(now.getTime() - days * 24 * 3600_000);
const base = { lastSeenAt: ago(1), percents: [], absences: 0, missedWeekly: null };

describe("BR-R02: e'tibor kerak sabablari", () => {
  it("hammasi joyida bo'lsa sabab yo'q", () => {
    expect(attentionReasons({ ...base, percents: [80, 70, 90, 80, 75, 85], absences: 1 }, now)).toEqual([]);
  });

  it("faolsiz, natija tushgan, dars qoldirgan, haftalik topshirmagan: faktli izoh bilan", () => {
    const r = attentionReasons(
      { lastSeenAt: ago(12), percents: [90, 80, 85, 60, 50, 70], absences: 3, missedWeekly: "3-hafta" },
      now,
    );
    expect(r).toEqual([
      { code: "INACTIVE", text: "12 kundan beri ilovaga kirmagan" },
      { code: "DROP", text: "Mavzu testlari: oldin 85%, oxirgi 3 tasida 60%" },
      { code: "ABSENT", text: "Oxirgi 14 kunda 3 marta darsga kelmagan" },
      { code: "MISSED_WEEKLY", text: "“3-hafta” haftalik testini topshirmagan" },
    ]);
  });

  it("chegaralar: 6 kun faol, 19 punkt tushish, 6 tadan kam test", () => {
    expect(attentionReasons({ ...base, lastSeenAt: ago(6.9) }, now)).toEqual([]);
    expect(attentionReasons({ ...base, percents: [80, 80, 80, 61, 61, 61] }, now)).toEqual([]);
    expect(attentionReasons({ ...base, percents: [90, 90, 10, 10, 10] }, now)).toEqual([]);
  });
});
