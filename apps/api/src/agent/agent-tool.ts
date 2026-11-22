import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/** Agent asbobi mavjud admin endpoint'ini foydalanuvchining o'z tokeni bilan chaqiradi: RBAC, tekshiruv va audit o'sha */
export interface AgentRequest {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: object;
}

export interface ToolDef<T> {
  name: string;
  description: string;
  schema: z.ZodType<T>;
  /** true: o'zgartiradi — ustoz tasdiqlamaguncha bajarilmaydi */
  write: boolean;
  /** Foydalanuvchiga ko'rinadigan qisqa nom: "Kurs yaratish: Algebra" */
  title: (input: T) => string;
  request: (input: T) => AgentRequest;
  /** Yozish amali uchun oldindan sinov (dryRun): tasdiq oynasida ko'rsatiladi */
  preview?: (input: T) => AgentRequest;
  /** Sinov natijasi yaroqsiz bo'lsa (masalan, savolda xato) agentga qaytadigan matn */
  invalid?: (preview: unknown) => string | null;
  /** Tasdiq oynasidagi tafsilotlar (preview javobi bilan) */
  lines?: (input: T, preview: unknown) => string[];
}

export interface AgentTool {
  def: ToolDef<unknown>;
  parse: (raw: unknown) => { ok: true; value: unknown } | { ok: false; error: string };
  api: Anthropic.Beta.BetaTool;
}

export function tool<T>(def: ToolDef<T>): AgentTool {
  const { $schema: _drop, ...schema } = z.toJSONSchema(def.schema) as Record<string, unknown>;
  return {
    def: def as ToolDef<unknown>,
    parse: (raw) => {
      const r = def.schema.safeParse(raw);
      return r.success
        ? { ok: true, value: r.data }
        : { ok: false, error: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
    },
    api: {
      name: def.name,
      description: def.description,
      input_schema: schema as Anthropic.Beta.BetaTool.InputSchema,
    },
  };
}

export const id = z.string().min(1).max(40);
export const q = (s: string) => encodeURIComponent(s);
