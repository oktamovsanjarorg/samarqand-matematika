import { Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { clock } from "../../lib/time";

/** Qolgan vaqt (server muddati bo'yicha). Tugaganda onExpire: server urinishni o'zi topshiradi */
export function Countdown({ deadline, onExpire }: { deadline: string; onExpire: () => void }) {
  const end = new Date(deadline).getTime();
  const [now, setNow] = useState(() => Date.now());
  const left = end - now;
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const expired = left <= 0;
  const expire = useRef(onExpire);
  expire.current = onExpire;
  useEffect(() => {
    if (expired) expire.current();
  }, [expired]);
  const low = left < 5 * 60_000;
  return (
    <p
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${low ? "bg-danger/10 text-danger" : "bg-brand/5"}`}
      data-testid="countdown"
      role="timer"
    >
      <Timer size={16} className="shrink-0" />
      <span>
        Qolgan vaqt: <b className="tabular-nums">{clock(left)}</b>
        <span className="font-normal text-hint"> · vaqt tugasa javoblar oʻzi topshiriladi</span>
      </span>
    </p>
  );
}
