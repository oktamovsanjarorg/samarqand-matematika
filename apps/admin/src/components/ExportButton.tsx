import { Download } from "lucide-react";

/** Natijalarni Excel'ga (CSV) yuklab olish tugmasi (T-076) */
export function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Excel'ga yuklab olish"
      className="tap inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-link"
    >
      <Download size={16} /> Excel
    </button>
  );
}
