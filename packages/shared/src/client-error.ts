import { z } from "zod";

/**
 * T-190: Mini App yoki admin panelda yiqilgan xato serverga yuboriladi (server logi toza bo'lsa ham
 * telefonda nima bo'lganini ko'rish uchun). Matnlar qisqa: uzun stack yuborib bo'lmaydi.
 */
export const clientErrorBody = z.object({
  app: z.enum(["miniapp", "admin"]),
  message: z.string().trim().min(1).max(300),
  /** Sahifa yo'li (query va hash'siz: ularda initData yoki token bo'lishi mumkin) */
  page: z.string().max(200).optional(),
  /** Xato qayerdan: fayl:qator yoki stack'ning birinchi qatorlari */
  where: z.string().max(600).optional(),
  /** Telegram platformasi va versiyasi (masalan "android 9.1") yoki brauzer */
  client: z.string().max(120).optional(),
});
export type ClientErrorBody = z.infer<typeof clientErrorBody>;
