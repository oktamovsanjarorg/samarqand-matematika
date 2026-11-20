/** Topshirishdan oldingi tasdiq: javobsiz savollar soni aytiladi */
export function SubmitPanel(p: {
  unanswered: number;
  warning?: string;
  busy: boolean;
  error?: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="card space-y-3 border-2 border-brand/30" role="dialog" aria-label="Topshirish">
      <p className="font-bold">Testni topshirasizmi?</p>
      <p className="text-sm text-hint">
        {p.unanswered > 0
          ? `Javob berilmagan savollar: ${p.unanswered} ta. `
          : "Hamma savolga javob berdingiz. "}
        Topshirilgandan keyin javoblarni oʻzgartirib boʻlmaydi.
      </p>
      {p.warning && <p className="text-sm font-semibold text-danger">{p.warning}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={p.onCancel}
          className="tap h-12 flex-1 rounded-xl border border-hint/25 font-semibold"
        >
          Qaytish
        </button>
        <button
          type="button"
          onClick={p.onSubmit}
          disabled={p.busy}
          className="tap h-12 flex-1 rounded-xl bg-brand font-bold text-white disabled:opacity-50"
        >
          Topshirish
        </button>
      </div>
      {p.error && (
        <p className="text-sm text-danger" role="alert">
          {p.error}
        </p>
      )}
    </div>
  );
}
