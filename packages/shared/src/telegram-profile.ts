import { z } from "zod";

/** Telegram foydalanuvchi profili (initData.user va bot ctx.from uchun umumiy) */
export const telegramProfileSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
  photo_url: z.string().optional(),
});
export type TelegramProfile = z.infer<typeof telegramProfileSchema>;
