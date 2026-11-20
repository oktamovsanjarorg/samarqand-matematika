const DAY = 24 * 60 * 60 * 1000;

/**
 * Yangi obuna davri (BR-B03): faol obuna bo'lsa uning oxiridan davom etadi, kun yo'qolmaydi.
 * Tugagan bo'lsa hozirdan boshlanadi.
 */
export function nextPeriod(now: Date, activeEnd: Date | null, durationDays: number) {
  const startsAt = activeEnd && activeEnd > now ? activeEnd : now;
  return { startsAt, endsAt: new Date(startsAt.getTime() + durationDays * DAY) };
}
