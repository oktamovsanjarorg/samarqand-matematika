import { describeResponse, type ReviewItem } from "@samarqand/shared";
import { useState } from "react";
import { useGrade } from "../../lib/review";
import { MathText } from "../MathText";
import { ProtectedImage } from "../ProtectedImage";
import { Badge } from "../ui";
import { AiBox } from "./AiBox";

function Line({ label, text }: { label: string; text: string | null }) {
  return (
    <p className="text-sm">
      <span className="text-hint">{label}: </span>
      {text ? (
        <MathText text={text} className="inline" />
      ) : (
        <span className="text-hint">javob berilmagan</span>
      )}
    </p>
  );
}

function Flags({ item }: { item: ReviewItem }) {
  return (
    <div className="flex flex-wrap gap-1">
      {item.ai?.suspected && <Badge tone="danger">Shubha</Badge>}
      {item.signals.sameWrong > 0 && (
        <Badge tone="danger">Bir xil xato: yana {item.signals.sameWrong} kishi</Badge>
      )}
      {item.signals.historyJump && <Badge tone="danger">Tarixdan keskin farq</Badge>}
      {item.decision && <Badge tone="success">Ustoz: {item.decision.points} ball</Badge>}
    </div>
  );
}

/** Ball qo'yish: 1 yoki 0, ixtiyoriy izoh (o'quvchi oyna yopilgach ko'radi) */
function GradeForm({ item, testId }: { item: ReviewItem; testId: string }) {
  const [note, setNote] = useState(item.decision?.note ?? "");
  const grade = useGrade(testId);
  const btn = "tap min-h-11 flex-1 rounded-xl font-semibold disabled:opacity-50";
  return (
    <div className="space-y-2 border-t border-hint/15 pt-3">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Izoh oʻquvchiga (ixtiyoriy)"
        aria-label="Izoh"
        className="min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm"
      />
      <div className="flex gap-2">
        {([1, 0] as const).map((points) => (
          <button
            key={points}
            type="button"
            disabled={grade.isPending}
            onClick={() => grade.mutate({ item, points, note })}
            className={`${btn} ${points ? "bg-success text-white" : "border border-hint/25"}`}
          >
            {points} ball
          </button>
        ))}
      </div>
      {grade.error && (
        <p className="text-sm text-danger" role="alert">
          {grade.error.message}
        </p>
      )}
    </div>
  );
}

export function ReviewCard({ item, testId }: { item: ReviewItem; testId: string }) {
  return (
    <li className="card space-y-3" data-testid="review-item">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 font-bold">
          {item.student.name} · {item.order + 1}-savol
        </span>
        <Flags item={item} />
      </div>
      <MathText text={item.question.text} className="line-clamp-3 text-[15px]" />
      <Line label="Javob" text={describeResponse(item.question, item.response)} />
      {item.correctAnswer !== null && (
        <Line label="Toʻgʻri javob" text={describeResponse(item.question, item.correctAnswer)} />
      )}
      <p className="text-sm text-hint">
        Avtomatik: {item.autoPoints} ball{item.photos.length === 0 ? " (yechim rasmi yoʻq)" : ""}
      </p>
      {item.photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.photos.map((id, i) => (
            <ProtectedImage key={id} path={`/admin/weekly/photos/${id}`} alt={`Yechim rasmi ${i + 1}`} />
          ))}
        </div>
      )}
      <AiBox ai={item.ai} />
      <GradeForm item={item} testId={testId} />
    </li>
  );
}
