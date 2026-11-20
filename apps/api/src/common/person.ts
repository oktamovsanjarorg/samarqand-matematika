/** Ism: o'quvchi profilidagi to'liq ism, bo'lmasa Telegram ismi */
export const PERSON_SELECT = {
  firstName: true,
  lastName: true,
  student: { select: { fullName: true } },
} as const;
export const personName = (u: {
  firstName: string;
  lastName: string | null;
  student: { fullName: string | null } | null;
}) => u.student?.fullName ?? [u.firstName, u.lastName].filter(Boolean).join(" ");
