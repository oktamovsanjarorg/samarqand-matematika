import { MAX_RECEIPT_BYTES } from "@samarqand/shared";

const MAX_SIDE = 1600;

/**
 * Telefon rasmi katta bo'ladi: chek yoki daftar o'qilishi uchun 1600px yetarli. JPEG'ga siqiladi (5 MB chegara).
 * Brauzer siqa olmasa va asl fayl chegaradan kichik bo'lsa, o'zi yuboriladi.
 */
export async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (blob && blob.size <= MAX_RECEIPT_BYTES) return blob;
  } catch {
    // pastda asl fayl tekshiriladi
  }
  if (file.size <= MAX_RECEIPT_BYTES) return file;
  throw new Error("Rasm juda katta. Boshqa rasm tanlang");
}

/** Rasmni yuborish: tana — rasm baytlari */
export const imageInit = (method: string, body: Blob): RequestInit => ({
  method,
  body,
  headers: { "Content-Type": body.type || "image/jpeg" },
});
