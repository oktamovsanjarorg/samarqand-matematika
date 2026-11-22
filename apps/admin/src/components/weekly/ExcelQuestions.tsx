import type { WeeklyQuestionRow } from "@samarqand/shared";
import { useState } from "react";
import { useTree } from "../../lib/content";
import { QuestionImport } from "../QuestionImport";

const field = "min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm";

/**
 * Excel fayldan to'g'ridan-to'g'ri testga (T-157): savollar tanlangan mavzuga qoralama bo'lib saqlanadi
 * (mashqda ko'rinmaydi) va shu zahoti testga fayldagi tartibda qo'shiladi
 */
export function ExcelQuestions({ onAdd }: { onAdd: (rows: WeeklyQuestionRow[]) => void }) {
  const topics =
    useTree().data?.flatMap((c) => c.topics.map((t) => ({ id: t.id, title: `${c.title} · ${t.title}` }))) ??
    [];
  const [topicId, setTopicId] = useState("");
  const topic = topics.find((t) => t.id === topicId);
  return (
    <div className="space-y-2">
      <select
        value={topicId}
        onChange={(e) => setTopicId(e.target.value)}
        aria-label="Savollar saqlanadigan mavzu"
        className={field}
      >
        <option value="">Savollar qaysi mavzuga saqlansin?</option>
        {topics.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
      {topic && (
        <QuestionImport
          key={topic.id}
          open
          topicId={topic.id}
          onSaved={(r) => onAdd(r.questions.map((q) => ({ ...q, topicTitle: topic.title })))}
        />
      )}
    </div>
  );
}
