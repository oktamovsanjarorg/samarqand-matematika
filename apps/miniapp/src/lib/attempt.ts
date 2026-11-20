import type { AttemptView } from "@samarqand/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Response } from "./answers";
import { put } from "./api";

/** Yechiladigan urinish: mavzu testi yoki haftalik test */
export interface Answerable {
  id: string;
  questions: AttemptView["questions"];
}

const TYPING_DELAY = 800;

/**
 * Javoblar (`base` — "/attempts" yoki "/weekly-attempts"): ekranda darhol yangilanadi, serverga tanlovda darhol, yozuvda 0.8 soniyadan keyin saqlanadi.
 * flush() kutilayotgan hamma yozuvni saqlaydi (topshirishdan oldin).
 */
export function useAnswers(attempt: Answerable, base: string) {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(attempt.questions.map((x) => [x.question.id, x.response])),
  );
  const [failed, setFailed] = useState(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<string, Response>());

  const send = useCallback(
    async (qid: string) => {
      const r = pending.current.get(qid);
      if (!r) return;
      pending.current.delete(qid);
      await put(`${base}/${attempt.id}/answers/${qid}`, { response: r }).then(
        () => setFailed(false),
        (e: unknown) => {
          setFailed(true);
          throw e;
        },
      );
    },
    [attempt.id, base],
  );

  const set = (qid: string, r: Response, immediate: boolean) => {
    setValues((v) => ({ ...v, [qid]: r }));
    pending.current.set(qid, r);
    clearTimeout(timers.current.get(qid));
    if (immediate) void send(qid).catch(() => undefined);
    else
      timers.current.set(
        qid,
        setTimeout(() => void send(qid).catch(() => undefined), TYPING_DELAY),
      );
  };

  const flush = useCallback(async () => {
    timers.current.forEach(clearTimeout);
    await Promise.all([...pending.current.keys()].map(send));
  }, [send]);

  // Ilova yopilsa yoki fonga o'tsa yozilayotgan javob yo'qolmaydi
  useEffect(() => {
    const t = timers.current;
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      t.forEach(clearTimeout);
    };
  }, [flush]);

  return { values, set, flush, failed };
}
