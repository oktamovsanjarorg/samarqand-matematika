import type { PrismaClient } from "@samarqand/db";
import type { AdminPayment } from "@samarqand/shared";
import { PERSON_SELECT, personName } from "../common/person";

type Dup = AdminPayment["duplicateOf"];
interface Item {
  id: string;
  receiptHash: string | null;
  createdAt: Date;
}

/**
 * Aynan shu rasm bilan avval yuborilgan chek (T-124): o'quvchi eski yoki boshqaning chekini qayta yuborsa.
 * Faqat bayt-ma-bayt bir xil faylni topadi; birinchi yuborilgan chekda ogohlantirish yo'q.
 */
export async function receiptDuplicates(
  prisma: Pick<PrismaClient, "payment">,
  items: Item[],
): Promise<Map<string, Dup>> {
  const hashes = [...new Set(items.flatMap((i) => (i.receiptHash ? [i.receiptHash] : [])))];
  const out = new Map<string, Dup>();
  if (!hashes.length) return out;
  const all = await prisma.payment.findMany({
    where: { receiptHash: { in: hashes } },
    orderBy: { createdAt: "asc" },
    select: { id: true, receiptHash: true, createdAt: true, user: { select: PERSON_SELECT } },
  });
  for (const i of items) {
    const first = all.find(
      (p) => p.receiptHash === i.receiptHash && p.id !== i.id && p.createdAt <= i.createdAt,
    );
    if (first) out.set(i.id, { student: personName(first.user), createdAt: first.createdAt.toISOString() });
  }
  return out;
}
