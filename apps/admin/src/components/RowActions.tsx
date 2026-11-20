import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const icon = "tap flex h-10 w-10 items-center justify-center rounded-lg text-hint disabled:opacity-30";

/** Tartiblash, nomini o'zgartirish va ikki bosqichli o'chirish tugmalari */
/** Ikki bosqichli o'chirish: tasdiq 4 soniyadan keyin bekor bo'ladi, tasodifiy ikkinchi bosish o'chirib yubormasin */
function DeleteButton({ name, onDelete }: { name: string; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 4000);
    return () => clearTimeout(t);
  }, [confirm]);
  if (confirm)
    return (
      <button
        type="button"
        onClick={onDelete}
        className="tap min-h-10 rounded-lg bg-danger px-2 text-xs font-semibold text-white"
      >
        Oʻchirilsinmi?
      </button>
    );
  return (
    <button type="button" className={icon} onClick={() => setConfirm(true)} aria-label={`${name}: oʻchirish`}>
      <Trash2 size={16} />
    </button>
  );
}

export function RowActions(p: {
  name: string;
  onUp?: () => void;
  onDown?: () => void;
  onRename?: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <button
        type="button"
        className={icon}
        disabled={!p.onUp}
        onClick={p.onUp}
        aria-label={`${p.name}: yuqoriga`}
      >
        <ArrowUp size={16} />
      </button>
      <button
        type="button"
        className={icon}
        disabled={!p.onDown}
        onClick={p.onDown}
        aria-label={`${p.name}: pastga`}
      >
        <ArrowDown size={16} />
      </button>
      {p.onRename && (
        <button
          type="button"
          className={icon}
          onClick={p.onRename}
          aria-label={`${p.name}: nomini oʻzgartirish`}
        >
          <Pencil size={16} />
        </button>
      )}
      <DeleteButton name={p.name} onDelete={p.onDelete} />
    </div>
  );
}
