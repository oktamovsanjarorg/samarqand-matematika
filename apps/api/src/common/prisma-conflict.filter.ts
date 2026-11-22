import {
  ArgumentsHost,
  Catch,
  ConflictException,
  type ExceptionFilter,
  type HttpException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { Prisma } from "@samarqand/db";

/** Prisma xato kodi → foydalanuvchiga tushunarli javob (qolganlari 500 bo'lib qoladi) */
const KNOWN: Record<string, () => HttpException> = {
  // T-095: bog'langan yozuv tufayli o'chmaydigan qator
  P2003: () => new ConflictException("Bu yozuv boshqa maʼlumotlarda ishlatilgan: avval ularni olib tashlang"),
  // T-107: ikki xodim bir vaqtda bir xil yozuvni yaratdi yoki tikladi
  P2002: () => new ConflictException("Bu yozuv allaqachon bor: sahifani yangilang"),
  // T-107: yozuvni shu payt boshqa xodim o'chirib yubordi
  P2025: () => new NotFoundException("Yozuv topilmadi: sahifani yangilang"),
};

/**
 * Zaxira himoya: FK, takroriy yozuv va yo'qolgan yozuv 500 emas, 409 yoki 404 qaytaradi.
 * Asosiy tekshiruv servisda bo'lishi kerak: bu filtr faqat poyga (race) va unutilgan holat uchun.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaConflictFilter extends BaseExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger("PrismaConflict");

  override catch(e: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const known = KNOWN[e.code];
    if (!known) return super.catch(e, host);
    this.log.warn(`Prisma ${e.code}: ${String(e.meta?.modelName ?? "")}`);
    return super.catch(known(), host);
  }
}
