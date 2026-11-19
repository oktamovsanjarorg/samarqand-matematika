import { renderMathText } from "@samarqand/math";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

/**
 * Savol, variant va izoh matni: `$...$` va `$$...$$` formulalar KaTeX bilan chiziladi.
 * renderMathText formuladan tashqaridagi matnni escape qiladi, shuning uchun innerHTML xavfsiz.
 */
export function MathText({ text, className = "" }: { text: string; className?: string }) {
  const html = useMemo(() => renderMathText(text), [text]);
  return (
    <div
      className={`math-text whitespace-pre-wrap ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
