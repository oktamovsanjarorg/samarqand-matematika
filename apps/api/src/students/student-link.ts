import type { Prisma } from "@samarqand/db";

type Tx = Prisma.TransactionClient;
type Profile = {
  id: string;
  fullName: string | null;
  accessMode: "AUTO" | "FREE" | "CLOSED";
  acceptedAt: Date | null;
  acceptedById: string | null;
  groupId: string | null;
  parentCode: string | null;
};

/** Ikki marta bo'lmasligi kerak bo'lgan yozuvlar: Telegram'li o'quvchida bor bo'lsa qo'lda kiritilganinikini tashlaymiz */
async function dropClashes(tx: Tx, ids: { fromUser: string; toUser: string; from: string; to: string }) {
  const { fromUser, toUser, from, to } = ids;
  const dates = await tx.attendance.findMany({ where: { userId: toUser }, select: { date: true } });
  await tx.attendance.deleteMany({ where: { userId: fromUser, date: { in: dates.map((d) => d.date) } } });
  const parents = await tx.parentLink.findMany({ where: { studentId: to }, select: { parentId: true } });
  await tx.parentLink.deleteMany({
    where: { studentId: from, parentId: { in: parents.map((p) => p.parentId) } },
  });
}

/**
 * Qo'lda kiritilgan o'quvchini (Telegram'siz) Telegram'li hisobga ko'chiradi (T-186): ustoz yozgan ism,
 * qabul, guruh va kirish rejimi; davomat, offline natijalar, obuna, to'lov va ota-onalar. Keyin
 * qo'lda kiritilgan yozuv o'chiriladi. Telegram'li hisob allaqachon qabul qilingan bo'lsa, uning
 * qabul va kirish rejimi saqlanadi.
 */
export async function mergeManualInto(tx: Tx, fromUser: string, toUser: string, from: Profile) {
  const to = await tx.studentProfile.upsert({
    where: { userId: toUser },
    update: {},
    create: { userId: toUser },
  });
  await dropClashes(tx, { fromUser, toUser, from: from.id, to: to.id });
  const move = { where: { userId: fromUser }, data: { userId: toUser } };
  await tx.attendance.updateMany(move);
  await tx.offlineResult.updateMany(move);
  await tx.subscription.updateMany(move);
  await tx.payment.updateMany(move);
  await tx.parentLink.updateMany({ where: { studentId: from.id }, data: { studentId: to.id } });
  // parentCode noyob: avval qo'lda kiritilgandan olib tashlanadi
  await tx.studentProfile.update({ where: { id: from.id }, data: { parentCode: null } });
  await tx.studentProfile.update({
    where: { id: to.id },
    data: {
      fullName: from.fullName ?? to.fullName,
      groupId: from.groupId ?? to.groupId,
      parentCode: to.parentCode ?? from.parentCode,
      announcedAt: new Date(),
      ...(to.acceptedAt
        ? {}
        : { acceptedAt: from.acceptedAt, acceptedById: from.acceptedById, accessMode: from.accessMode }),
    },
  });
  await tx.user.delete({ where: { id: fromUser } });
}
