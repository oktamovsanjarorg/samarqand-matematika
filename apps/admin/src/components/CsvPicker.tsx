import { FileUp } from "lucide-react";
import { useState } from "react";

/**
 * CSV fayl tanlash (T-101): brauzerning inglizcha "Choose File" tugmasi o'rniga o'zbekcha tugma.
 * Asl input ko'rinmaydi, lekin klaviatura va ekran o'qigich uchun joyida turadi.
 */
export function CsvPicker({ onText }: { onText: (text: string) => void }) {
  const [name, setName] = useState("");
  return (
    <label className="tap flex min-h-11 w-fit max-w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-hint/40 bg-section px-4 text-sm font-semibold focus-within:ring-2 focus-within:ring-brand">
      <FileUp size={16} className="shrink-0" />
      <span className="truncate">{name || "CSV faylni tanlang"}</span>
      <input
        type="file"
        accept=".csv,.txt,text/csv"
        aria-label="CSV fayl"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          setName(file?.name ?? "");
          onText(file ? await file.text() : "");
        }}
        className="sr-only"
      />
    </label>
  );
}
