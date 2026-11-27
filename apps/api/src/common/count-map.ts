/**
 * T-189: Prisma `groupBy` natijasidan "id → soni" xaritasi. `_count: { select: { rel: ... } }` o'rniga
 * ishlatiladi: u bog'langan butun jadvalni guruhlaydi, groupBy esa faqat berilgan id'lar bo'yicha indeksdan o'qiydi.
 */
export function countMap<K extends string>(
  rows: (Record<K, string> & { _count: { _all: number } })[],
  key: K,
) {
  return new Map(rows.map((r) => [r[key], r._count._all]));
}
