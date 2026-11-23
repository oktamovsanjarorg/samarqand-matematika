import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { SolutionPhotoInput } from "../ai/ai-provider";
import { photoInputs } from "../ai/photos";
import { PrismaService } from "../prisma/prisma.service";
import { MediaStore, sniffImage } from "../storage/media-store";

/**
 * Yordamchiga rasm (T-170, BR-T06): avval yuklanadi, keyin xabar bilan yuboriladi.
 * Suhbatda bir vaqtda bitta yuborilmagan rasm turadi: yangisi eskisini almashtiradi (disk to'lmasin).
 */
@Injectable()
export class TutorPhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaStore,
  ) {}

  async add(userId: string, chatId: string, body: unknown): Promise<{ id: string }> {
    if (!Buffer.isBuffer(body) || body.length === 0) throw new BadRequestException("Rasm yuboring");
    const image = sniffImage(body);
    if (!image) throw new BadRequestException("Faqat rasm (JPG, PNG, WEBP) qabul qilinadi");
    const chat = await this.prisma.tutorChat.findFirst({
      where: { id: chatId, userId },
      select: { id: true },
    });
    if (!chat) throw new NotFoundException("Suhbat topilmadi");
    const old = await this.prisma.tutorPhoto.findMany({ where: { chatId, messageId: null } });
    const id = randomUUID();
    const path = await this.media.save("tutor", id, body, image.ext);
    await this.prisma.$transaction([
      this.prisma.tutorPhoto.deleteMany({ where: { id: { in: old.map((p) => p.id) } } }),
      this.prisma.tutorPhoto.create({ data: { id, chatId, path, bytes: body.length } }),
    ]);
    await Promise.all(old.map((p) => this.media.remove(p.path)));
    return { id };
  }

  /** Xabarga biriktiriladigan, hali yuborilmagan rasm */
  async pending(chatId: string, photoId: string): Promise<{ id: string; input: SolutionPhotoInput }> {
    const p = await this.prisma.tutorPhoto.findFirst({ where: { id: photoId, chatId, messageId: null } });
    if (!p) throw new NotFoundException("Rasm topilmadi. Qayta yuklang");
    const [input] = await photoInputs(this.media, [p.path]);
    if (!input) throw new BadRequestException("Rasmni oʻqib boʻlmadi");
    return { id: p.id, input };
  }

  /** O'quvchi o'z suhbatidagi rasmni ko'radi */
  async readOwn(userId: string, photoId: string) {
    const p = await this.prisma.tutorPhoto.findFirst({ where: { id: photoId, chat: { userId } } });
    if (!p) throw new NotFoundException("Rasm topilmadi");
    return this.media.read(p.path);
  }

  /** Ustoz va yordamchi (BR-T04) */
  async read(photoId: string) {
    const p = await this.prisma.tutorPhoto.findUnique({ where: { id: photoId } });
    if (!p) throw new NotFoundException("Rasm topilmadi");
    return this.media.read(p.path);
  }
}
