import {
  parseSectionsText,
  sectionsToText,
  type AdminOfflineTestDetail,
  type OfflinePreview,
  type OfflineSection,
} from "@samarqand/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { tashkentToday, useGroups } from "../../lib/groups";
import { Button } from "../ui";
import { TablePicker } from "../TablePicker";
import { PreviewView } from "./PreviewView";
import { SectionsField } from "./SectionsField";

const field = "min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm";

type Head = { title: string; date: string; groupId: string };

function HeadFields({ v, set }: { v: Head; set: (h: Head) => void }) {
  const groups = useGroups();
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <input
        value={v.title}
        onChange={(e) => set({ ...v, title: e.target.value })}
        placeholder="Test nomi"
        aria-label="Test nomi"
        className={field}
      />
      <input
        type="date"
        value={v.date}
        max={tashkentToday()}
        onChange={(e) => set({ ...v, date: e.target.value })}
        aria-label="Sana"
        className={field}
      />
      <select
        value={v.groupId}
        onChange={(e) => set({ ...v, groupId: e.target.value })}
        aria-label="Guruh"
        className={field}
      >
        <option value="">Guruhsiz</option>
        {groups.data?.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Matndagi fan bo'limlari: xato bo'lsa sababi, bo'sh bo'lsa skaner bo'limlari olinadi */
function readSections(text: string, n: number): { list: OfflineSection[] } | { error: string } {
  try {
    return { list: parseSectionsText(text, n) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Boʻlimlar notoʻgʻri" };
  }
}

function useImport() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [head, setHead] = useState<Head>({ title: "", date: tashkentToday(), groupId: "" });
  const [csv, setCsv] = useState("");
  const [text, setText] = useState("");
  const body = { csv, groupId: head.groupId || null };
  const preview = useMutation({
    mutationFn: () => api.post<OfflinePreview>("/admin/offline-tests/preview", body),
    onSuccess: (p) => {
      const suggested = p.savedSections ?? p.fileSections;
      if (!text.trim() && suggested.length) setText(sectionsToText(suggested));
      if (!head.title.trim() && p.exam) setHead({ ...head, title: p.exam });
    },
  });
  const p = preview.data;
  const sections = p ? readSections(text, p.questionCount) : null;
  const save = useMutation({
    mutationFn: () =>
      api.post<AdminOfflineTestDetail>("/admin/offline-tests", {
        ...body,
        title: head.title,
        date: head.date,
        sections: sections && "list" in sections ? sections.list : [],
      }),
    onSuccess: (t) => {
      void qc.invalidateQueries({ queryKey: ["offline"] });
      navigate(`/offline/${t.id}`);
    },
  });
  const ok = !!p?.rows.length && !!sections && "list" in sections && head.title.trim().length >= 2;
  return { head, setHead, csv, setCsv, text, setText, preview, p, sections, save, ok };
}

/** Skaner eksporti yoki Q1..Qn jadval → oldindan ko'rish (ball, daraja, moslash) → fan bo'limlari → saqlash */
export function ImportForm() {
  const { head, setHead, csv, setCsv, text, setText, preview, p, sections, save, ok } = useImport();
  return (
    <section className="card space-y-3">
      <h2 className="font-bold">Natijalarni yuklash</h2>
      <p className="text-sm text-hint">
        Skaner eksporti (Q 1 Marks …) yoki Excel/CSV jadval: ism ustuni (Ism yoki F.I.O), ixtiyoriy Telefon,
        Q1, Q2 … ustunlarida 1 (toʻgʻri), 0 (xato) yoki boʻsh.
      </p>
      <HeadFields v={head} set={setHead} />
      <TablePicker
        onText={(t) => {
          setCsv(t);
          preview.reset();
        }}
      />
      <Button variant="secondary" onClick={() => preview.mutate()} busy={preview.isPending} disabled={!csv}>
        Tekshirish
      </Button>
      {preview.error && <p className="text-sm text-danger">{preview.error.message}</p>}
      {p && (
        <>
          <PreviewView p={p} />
          <SectionsField
            value={text}
            onChange={setText}
            questionCount={p.questionCount}
            error={sections && "error" in sections ? sections.error : null}
          />
          <Button onClick={() => save.mutate()} busy={save.isPending} disabled={!ok}>
            Saqlash
          </Button>
          {save.error && <p className="text-sm text-danger">{save.error.message}</p>}
        </>
      )}
    </section>
  );
}
