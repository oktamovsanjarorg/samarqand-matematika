/** Har ekran uchun umumiy holatlar: yuklanmoqda, xato, bo'sh */
export function Splash() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <img src="/logo.jpg" alt="" className="h-28 w-28 rounded-card" />
      <div className="skeleton h-3 w-32" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-[15px] text-hint">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="tap h-12 rounded-xl bg-brand px-6 font-bold text-white"
        >
          Qayta urinish
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="card text-center">
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-sm text-hint">{hint}</p>
    </div>
  );
}
