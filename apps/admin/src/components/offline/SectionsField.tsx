/** Fan bo'limlari matni: har qatorda "Bo'lim nomi: savol raqamlari" */
export function SectionsField(p: {
  value: string;
  onChange: (v: string) => void;
  questionCount: number;
  error: string | null;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold">Fan boʻlimlari</span>
      <textarea
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        rows={5}
        aria-label="Fan boʻlimlari"
        placeholder={`Algebra: 1-10, 31\nGeometriya: 11-20\nTrigonometriya: 21-30`}
        className="w-full rounded-xl border border-hint/25 bg-section p-3 font-mono text-sm"
      />
      <span className="block text-xs text-hint">
        Har qatorda boʻlim nomi va savol raqamlari (1–{p.questionCount}). Bir savol bitta boʻlimda. Boʻsh
        qoldirsangiz, boʻlimlar boʻyicha hisob chiqmaydi; keyin test sahifasida qoʻshish mumkin.
      </span>
      {p.error && <span className="block text-sm text-danger">{p.error}</span>}
    </label>
  );
}
