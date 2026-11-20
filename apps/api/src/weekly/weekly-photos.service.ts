import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { MAX_SOLUTION_PHOTOS } from "@samarqand/shared";
import { randomUUID } from "node:crypto";
import { MediaStore, sniffImage } from "../storage/media-store";
import { PrismaService } from "../prisma/prisma.service";
import { WeeklyService } from "./weekly.service";

/** Yechim rasmlari (BR-W04): faqat oyna ochiq va test topshirilmagan paytda qo'shiladi/o'chiriladi */
@Injectable()
export class WeeklyPhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaStore,
    private readonly weekly: WeeklyService,
  ) {}

  async add(userId: string, attemptId: string, questionId: string, body: unknown): Promise<{ id: string }> {
    if (!Buffer.isBuffer(body) || body.length === 0) throw new BadRequestException("Rasm yuboring");
    const image = sniffImage(body);
    if (!image) throw new BadRequestException("Faqat rasm (JPG, PNG, WEBP) qabul qilinadi");
    const a = await this.weekly.ownOpen(userId, attemptId);
    if (!a.answers.some((x) => x.question.id === questionId))
      throw new NotFoundException("Savol bu testda yoʻq");

    const id = randomUUID();
    const path = await this.media.save("solutions", id, body, image.ext);
    try {
      // Bir vaqtda bir nechta yuklansa ham limitdan oshmasin: savol bo'yicha qulf
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`photo:${attemptId}:${questionId}`}))`;
        if ((await tx.solutionPhoto.count({ where: { attemptId, questionId } })) >= MAX_SOLUTION_PHOTOS)
          throw new ConflictException(`Har savolga koʻpi bilan ${MAX_SOLUTION_PHOTOS} ta rasm`);
        await tx.solutionPhoto.create({ data: { id, attemptId, questionId, path, bytes: body.length } });
      });
    } catch (e) {
      await this.media.remove(path);
      throw e;
    }
    return { id };
  }

  async remove(userId: string, attemptId: string, photoId: string): Promise<void> {
    await this.weekly.ownOpen(userId, attemptId);
    const p = await this.prisma.solutionPhoto.findFirst({ where: { id: photoId, attemptId } });
    if (!p) throw new NotFoundException("Rasm topilmadi");
    await this.prisma.solutionPhoto.delete({ where: { id: p.id } });
    await this.media.remove(p.path);
  }

  /** O'quvchi o'z rasmini istalgan payt ko'radi (natijada ham) */
  async readOwn(userId: string, photoId: string) {
    const p = await this.prisma.solutionPhoto.findFirst({
      where: { id: photoId, answer: { attempt: { userId } } },
    });
    if (!p) throw new NotFoundException("Rasm topilmadi");
    return this.media.read(p.path);
  }

  /** Ustoz navbati uchun (T-034) */
  async read(photoId: string) {
    const p = await this.prisma.solutionPhoto.findUnique({ where: { id: photoId } });
    if (!p) throw new NotFoundException("Rasm topilmadi");
    return this.media.read(p.path);
  }
}
