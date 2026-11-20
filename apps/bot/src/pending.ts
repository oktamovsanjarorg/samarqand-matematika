/**
 * Ota-ona havolasini bosgan, lekin hali raqamini ulashmagan foydalanuvchilar.
 * Bot bitta nusxada ishlaydi, shuning uchun xotirada saqlanadi. Qayta ishga tushsa, havolani qayta bosish kifoya.
 */
export function createPendingStore(ttlMs = 30 * 60 * 1000, now = () => Date.now()) {
  const items = new Map<number, { code: string; at: number }>();
  return {
    set(userId: number, code: string) {
      items.set(userId, { code, at: now() });
    },
    /** Kodni oladi va o'chiradi. Muddati o'tgan bo'lsa null */
    take(userId: number): string | null {
      const item = items.get(userId);
      items.delete(userId);
      return item && now() - item.at <= ttlMs ? item.code : null;
    },
  };
}
