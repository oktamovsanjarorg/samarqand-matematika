import { ArgumentsHost, Catch, ConflictException, type ExceptionFilter, Logger } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { Prisma } from "@samarqand/db";

/**
 * Zaxira himoya (T-095): bog'langan yozuv tufayli o'chmaydigan qator (FK, P2003) 500 emas, 409 qaytaradi.
 * Asosiy tekshiruv servisda bo'lishi kerak: bu filtr faqat unutilgan holat uchun.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaConflictFilter extends BaseExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger("PrismaConflict");

  override catch(e: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    if (e.code !== "P2003") return super.catch(e, host);
    this.log.warn(`FK cheklovi: ${String(e.meta?.field_name ?? "")}`);
    return super.catch(
      new ConflictException("Bu yozuv boshqa maʼlumotlarda ishlatilgan: avval ularni olib tashlang"),
      host,
    );
  }
}
