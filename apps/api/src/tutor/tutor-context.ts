import type { Question } from "@samarqand/db";
import { describeResponse } from "@samarqand/shared";
import { toDetail, toView } from "../questions/codec";

const orDash = (v: string | null | undefined) => (v && v.trim() ? v : "—");

/**
 * Yordamchi konteksti: savol, etalon (faqat yordamchi uchun), o'quvchi javobi.
 * Ko'chirish shubhasi va ustozga mo'ljallangan izohlar bu yerga hech qachon tushmaydi (BR-W05).
 */
export function questionContext(q: Question, x: { response: unknown; lines: string[] }): string {
  const view = toView(q);
  const detail = toDetail(q);
  const options = (view.options ?? []).map((o, i) => `${String.fromCharCode(65 + i)}) ${o.text}`).join("; ");
  return [
    `Savol: ${view.text}`,
    options && `Variantlar: ${options}`,
    `To'g'ri javob: ${orDash("answer" in detail ? describeResponse(view, detail.answer) : null)}`,
    `Etalon yechim: ${orDash(detail.solution)}`,
    `O'quvchi javobi: ${orDash(describeResponse(view, x.response))}`,
    ...x.lines,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Solishtirish uchun: kichik harf, faqat harf va raqam (oʻ, o', o` bir xil) */
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ʻʼ'`‘’]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");

/**
 * BR-T01: erkin savolda ochiq haftalik test savoli matni yuborilganmi.
 * Bo'sh joy va tinish belgilari hisobga olinmaydi; juda qisqa matnlar solishtirilmaydi.
 */
export function mentionsOpenQuestion(text: string, openQuestions: string[]): boolean {
  const t = norm(text);
  if (t.length < 8) return false;
  return openQuestions.some((q) => {
    const n = norm(q);
    return n.length >= 8 && (t.includes(n) || (t.length >= 16 && n.includes(t)));
  });
}
