import type { MediaStore } from "../storage/media-store";
import type { SolutionPhotoInput } from "./ai-provider";

const IMAGE_TYPES = new Set<string>(["image/jpeg", "image/png", "image/webp"]);

/** Yechim rasmlari AI'ga: faqat rasm turlari, saqlangan tartibda */
export async function photoInputs(media: MediaStore, paths: string[]): Promise<SolutionPhotoInput[]> {
  const files = await Promise.all(paths.map((p) => media.read(p)));
  return files
    .filter((f) => IMAGE_TYPES.has(f.type))
    .map((f) => ({ type: f.type as SolutionPhotoInput["type"], data: f.body }));
}
