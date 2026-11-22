import { FileUp } from "lucide-react";
import { useState } from "react";
import { tableText } from "../lib/table-file";

/** Excel (.xlsx, .xls), HTML jadval yoki CSV: turi fayl ichidan aniqlanadi (T-154, T-165) */
const fileText = async (file: File) => tableText(new Uint8Array(await file.arrayBuffer()), file.name);

/**
 * Jadval fayl tanlash (T-101, T-154, T-165): Excel (.xlsx, .xls) yoki CSV. Brauzerning inglizcha "Choose File" tugmasi o'rniga
 * o'zbekcha tugma; asl input ko'rinmaydi, lekin klaviatura va ekran o'qigich uchun joyida turadi.
 */
export function TablePicker({ onText }: { onText: (text: string) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <label className="tap flex min-h-11 w-fit max-w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-hint/40 bg-section px-4 text-sm font-semibold focus-within:ring-2 focus-within:ring-brand">
        <FileUp size={16} className="shrink-0" />
        <span className="truncate">{name || "Excel yoki CSV faylni tanlang"}</span>
        <input
          type="file"
          accept=".xlsx,.xls,.csv,.txt,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-label="Excel yoki CSV fayl"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            setName(file?.name ?? "");
            setError(null);
            try {
              onText(file ? await fileText(file) : "");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Faylni oʻqib boʻlmadi");
              onText("");
            }
          }}
          className="sr-only"
        />
      </label>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
