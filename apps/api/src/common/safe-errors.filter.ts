import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";

const MAX_FRAMES = 8;

/**
 * Logga yoziladigan xato tavsifi (T-141): nomi, kodi va stack qatorlari, xabar matnisiz.
 * Prisma validatsiya xatosining matnida so'rov argumentlari (ism, telefon) bo'ladi: u logga tushmasin.
 */
export function describeError(e: unknown): string {
  if (!(e instanceof Error)) return "Nomaʼlum xato";
  const code = (e as { code?: unknown }).code;
  const frames = (e.stack ?? "")
    .split("\n")
    .filter((l) => /^\s+at /.test(l))
    .slice(0, MAX_FRAMES);
  return [`${e.name}${typeof code === "string" ? ` ${code}` : ""}`, ...frames].join("\n");
}

/**
 * Kutilmagan xatolar (T-141): mijozga oddiy 500, logga faqat describeError.
 * Nest'ning standart filtri xabar matnini to'liq yozardi (shaxsiy ma'lumot logga tushishi mumkin edi).
 * HttpException (400, 403, 404, 409 ...) o'zgarishsiz o'tadi.
 */
@Catch()
export class SafeErrorsFilter extends BaseExceptionFilter implements ExceptionFilter {
  private readonly errors = new Logger("Xato");

  override catch(e: unknown, host: ArgumentsHost) {
    if (e instanceof HttpException) return super.catch(e, host);
    this.errors.error(describeError(e));
    return super.catch(new InternalServerErrorException(), host);
  }
}
