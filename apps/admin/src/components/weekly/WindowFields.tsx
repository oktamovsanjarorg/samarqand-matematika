const field = "min-h-11 w-full rounded-xl border border-hint/25 bg-section px-3 text-sm";

/** Oyna: ochilish va yopilish (Toshkent vaqti), haftalik test va mock uchun */
export function WindowFields<D extends { opens: string; closes: string }>({
  d,
  set,
}: {
  d: D;
  set: (p: Partial<D>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1">
        <span className="text-xs font-semibold text-hint">Ochiladi (Toshkent vaqti)</span>
        <input
          type="datetime-local"
          value={d.opens}
          onChange={(e) => set({ opens: e.target.value } as Partial<D>)}
          aria-label="Ochiladi"
          className={field}
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-semibold text-hint">Yopiladi</span>
        <input
          type="datetime-local"
          value={d.closes}
          onChange={(e) => set({ closes: e.target.value } as Partial<D>)}
          aria-label="Yopiladi"
          className={field}
        />
      </label>
    </div>
  );
}
