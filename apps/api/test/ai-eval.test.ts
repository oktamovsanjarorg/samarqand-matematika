import type { SolutionVerdictKind } from "@samarqand/shared";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAiProvider } from "../src/ai/ai.module";
import type { SolutionCheckInput, SolutionPhotoInput } from "../src/ai/ai-provider";
import { loadEnv } from "../src/config/env";

/**
 * Baholash to'plami (ADR-0004). Faqat AI_EVAL_DIR berilganda ishlaydi va pulli API'ni chaqiradi.
 * Ma'lumot repoga tushmaydi (o'quvchilarning real yechimlari): har holat — papka:
 *   case.json: { question, modelSolution, correctAnswer, studentAnswer, expected } (expected — ustoz hukmi)
 *   1.jpg, 2.png ...: yechim rasmlari
 * Ishga tushirish: AI_EVAL_DIR=/yo'l AI_PROVIDER=claude ANTHROPIC_API_KEY=... pnpm --filter @samarqand/api ai:eval
 */
const DIR = process.env.AI_EVAL_DIR;
const TYPES: Record<string, SolutionPhotoInput["type"]> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

type Case = SolutionCheckInput & { name: string; expected: SolutionVerdictKind };

async function loadCases(dir: string): Promise<Case[]> {
  const names = (await readdir(dir, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  return Promise.all(
    names.sort().map(async (name) => {
      const files = await readdir(join(dir, name));
      const meta = JSON.parse(await readFile(join(dir, name, "case.json"), "utf8")) as Omit<
        Case,
        "name" | "photos"
      >;
      const images = files.filter((f) => TYPES[f.split(".").pop()?.toLowerCase() ?? ""]).sort();
      const photos = await Promise.all(
        images.map(async (f) => ({
          type: TYPES[f.split(".").pop()?.toLowerCase() ?? ""] ?? "image/jpeg",
          data: await readFile(join(dir, name, f)),
        })),
      );
      return { ...meta, name, photos };
    }),
  );
}

describe.skipIf(!DIR)("AI baholash to'plami", () => {
  it("hukmlar ustoz hukmi bilan solishtiriladi", { timeout: 60 * 60 * 1000 }, async () => {
    const provider = createAiProvider(loadEnv());
    expect(provider.name).not.toBe("off");
    const cases = await loadCases(DIR ?? "");
    const rows: { name: string; expected: string; got: string }[] = [];
    for (const c of cases)
      rows.push({
        name: c.name,
        expected: c.expected,
        got: (await provider.checkSolution(c))?.verdict ?? "NULL",
      });
    const hit = rows.filter((r) => r.expected === r.got).length;
    const copies = rows.filter((r) => r.expected === "SUSPECTED_COPY");
    const falseCopy = rows.filter(
      (r) => r.got === "SUSPECTED_COPY" && r.expected !== "SUSPECTED_COPY",
    ).length;
    console.info(
      rows.map((r) => `${r.expected === r.got ? "✓" : "✗"} ${r.name}: ${r.expected} → ${r.got}`).join("\n"),
    );
    console.info(
      `Aniqlik: ${hit}/${rows.length}. Ko'chirish topildi: ${copies.filter((r) => r.got === "SUSPECTED_COPY").length}/${copies.length}. Notoʻgʻri shubha: ${falseCopy}`,
    );
    expect(rows.length).toBeGreaterThan(0);
  });
});
