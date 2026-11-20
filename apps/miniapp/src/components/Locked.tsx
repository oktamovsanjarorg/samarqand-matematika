import { Lock } from "lucide-react";

export function Locked({ title }: { title: string }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-8 text-center" data-testid="locked">
      <Lock size={32} className="text-hint" />
      <p className="font-bold">{title}</p>
      <p className="text-sm text-hint">
        Toʻlov va ota-ona tasdigʻidan keyin barcha darslar ochiladi. Savol boʻlsa, ustozga yozing.
      </p>
    </div>
  );
}
