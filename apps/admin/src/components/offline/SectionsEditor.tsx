import {
  parseSectionsText,
  sectionsToText,
  type AdminOfflineTestDetail,
  type OfflineSection,
} from "@samarqand/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { Button } from "../ui";
import { SectionsField } from "./SectionsField";

function read(text: string, n: number): { list: OfflineSection[] } | { error: string } {
  try {
    return { list: parseSectionsText(text, n) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Boʻlimlar notoʻgʻri" };
  }
}

/** Fan bo'limlarini keyin o'zgartirish: ball o'zgarmaydi, faqat bo'limlar bo'yicha hisob */
export function SectionsEditor({ t, onDone }: { t: AdminOfflineTestDetail; onDone: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState(sectionsToText(t.sections));
  const parsed = read(text, t.questionCount);
  const save = useMutation({
    mutationFn: () =>
      api.put(`/admin/offline-tests/${t.id}/sections`, { sections: "list" in parsed ? parsed.list : [] }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["offline"] });
      onDone();
    },
  });
  return (
    <div className="space-y-2">
      <SectionsField
        value={text}
        onChange={setText}
        questionCount={t.questionCount}
        error={"error" in parsed ? parsed.error : null}
      />
      <div className="flex gap-2">
        <Button onClick={() => save.mutate()} busy={save.isPending} disabled={"error" in parsed}>
          Boʻlimlarni saqlash
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Bekor qilish
        </Button>
      </div>
      {save.error && <p className="text-sm text-danger">{save.error.message}</p>}
    </div>
  );
}
