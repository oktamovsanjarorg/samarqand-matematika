import { Inject, Injectable } from "@nestjs/common";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize, resolve } from "node:path";
import { ENV, type Env } from "../config/env";

const SIGNATURES: { ext: string; type: string; test: (b: Buffer) => boolean }[] = [
  { ext: "jpg", type: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: "png",
    type: "image/png",
    test: (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  {
    ext: "webp",
    type: "image/webp",
    test: (b) =>
      b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  },
];

/** Rasm turi Content-Type'dan emas, baytlardan aniqlanadi. Rasm bo'lmasa null */
export function sniffImage(b: Buffer): { ext: string; type: string } | null {
  const s = SIGNATURES.find((x) => b.length > 12 && x.test(b));
  return s ? { ext: s.ext, type: s.type } : null;
}

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export type MediaFolder = "receipts" | "solutions";

/** Fayllar MEDIA_DIR/<papka> ichida (cheklar, yechim rasmlari). Yo'l faqat server yaratadi, tashqaridan kelmaydi */
@Injectable()
export class MediaStore {
  constructor(@Inject(ENV) private readonly env: Env) {}

  private abs(rel: string): string {
    const root = resolve(this.env.MEDIA_DIR);
    const full = resolve(root, normalize(rel));
    if (!full.startsWith(root + "/")) throw new Error("Notoʻgʻri yoʻl");
    return full;
  }

  async save(folder: MediaFolder, id: string, body: Buffer, ext: string): Promise<string> {
    const rel = join(folder, `${id}.${ext}`);
    await mkdir(dirname(this.abs(rel)), { recursive: true });
    await writeFile(this.abs(rel), body);
    return rel;
  }

  async read(rel: string): Promise<{ body: Buffer; type: string }> {
    const ext = rel.split(".").pop() ?? "";
    return { body: await readFile(this.abs(rel)), type: TYPES[ext] ?? "application/octet-stream" };
  }

  async remove(rel: string | null): Promise<void> {
    if (rel) await rm(this.abs(rel), { force: true });
  }
}
