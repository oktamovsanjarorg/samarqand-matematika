import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/** WCAG 2 A/AA qoidabuzarliklari qisqa ko'rinishda: sahifa, qoida, element, sabab (T-071) */
export async function violations(page: Page, label: string): Promise<string[]> {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  return r.violations.flatMap((v) =>
    v.nodes.map((n) => `${label} ${v.id}: ${n.target.join(" ")} ${n.failureSummary?.split("\n")[1] ?? ""}`),
  );
}

/** Skrinshot nomi: "/" → "home", "/a/b" → "a-b" */
export const shotName = (path: string) =>
  path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "-");
