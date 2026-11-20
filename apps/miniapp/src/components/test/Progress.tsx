/** Savollar raqamlari: joriy, javob berilgan va javobsiz */
export function Progress(p: {
  total: number;
  current: number;
  answered: boolean[];
  onJump: (i: number) => void;
}) {
  return (
    <nav className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Savollar">
      {Array.from({ length: p.total }, (_, i) => {
        const tone =
          i === p.current
            ? "bg-brand text-white"
            : p.answered[i]
              ? "bg-brand/15 text-brand"
              : "bg-hint/10 text-hint";
        return (
          <button
            key={i}
            type="button"
            onClick={() => p.onJump(i)}
            aria-current={i === p.current ? "step" : undefined}
            aria-label={`${i + 1}-savol${p.answered[i] ? ", javob berilgan" : ""}`}
            className={`tap h-9 min-w-9 shrink-0 rounded-lg text-sm font-bold ${tone}`}
          >
            {i + 1}
          </button>
        );
      })}
    </nav>
  );
}
