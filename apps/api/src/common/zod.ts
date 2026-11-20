import { BadRequestException } from "@nestjs/common";
import type { z } from "zod";

/** So'rov tanasini Zod bilan tekshiradi: xato bo'lsa birinchi xabar bilan 400 */
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    throw new BadRequestException(`${where}${issue?.message ?? "Notoʻgʻri maʼlumot"}`);
  }
  return parsed.data;
}
