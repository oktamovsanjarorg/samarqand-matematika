import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white",
  secondary: "border border-hint/25 bg-section text-text",
  danger: "border border-danger/40 bg-section text-danger",
  ghost: "text-hint",
};

export function Button({
  variant = "primary",
  busy,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || busy}
      className={`tap inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      {busy && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Badge({
  tone = "hint",
  children,
}: {
  tone?: "hint" | "brand" | "danger" | "success";
  children: ReactNode;
}) {
  const tones = {
    hint: "bg-hint/15 text-hint",
    brand: "bg-brand/10 text-brand",
    danger: "bg-danger/10 text-danger",
    success: "bg-success/10 text-success",
  };
  return <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton h-16" />
      ))}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-10 text-center">
      <Inbox size={28} className="text-hint" />
      <p className="font-semibold">{title}</p>
      {hint && <p className="text-sm text-hint">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card flex flex-col items-center gap-3 py-8 text-center">
      <AlertTriangle size={28} className="text-danger" />
      <p className="text-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Qayta urinish
        </Button>
      )}
    </div>
  );
}

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-xl font-extrabold">{title}</h1>
      {children}
    </div>
  );
}
