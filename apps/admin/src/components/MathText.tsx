import { renderMathText } from "@samarqand/math";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

/** `$...$` va `$$...$$` formulalarni KaTeX bilan chizadi. Formuladan tashqari matn escape qilinadi */
export function MathText({ text, className = "" }: { text: string; className?: string }) {
  const html = useMemo(() => renderMathText(text), [text]);
  return (
    <div
      className={`math-text whitespace-pre-wrap ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
