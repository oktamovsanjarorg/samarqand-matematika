import type { AttemptView } from "@samarqand/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Response } from "./answers";
import { answerStore } from "./answer-store";
import { put } from "./api";

/** Yechiladigan urinish: mavzu testi yoki haftalik test */
export interface Answerable {
  id: string;
  questions: AttemptView["questions"];
}

const TYPING_DELAY = 800;
/** T-150: saqlanmagan javobni qayta yuborish oralig'i */
export const RETRY_DELAY = 5_000;

/** Ilova fonga o'tsa yozilayotgan javob saqlanadi; saqlanmagani internet qaytganda va har 5 soniyada qayta yuboriladi (T-150) */
function useBackgroundSave(
  flush: () => Promise<void>,
  timers: Map<string, ReturnType<typeof setTimeout>>,
  failed: boolean,
) {
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      timers.forEach(clearTimeout);
    };
  }, [flush, timers]);

  // T-192: telefondan tiklangan javoblar ochilishda darhol yuboriladi (navbat bo'sh bo'lsa hech narsa qilmaydi)
  useEffect(() => {
    void flush().catch(() => undefined);
  }, [flush]);

  useEffect(() => {
    if (!failed) return;
    const retry = () => void flush().catch(() => undefined);
    const id = setInterval(retry, RETRY_DELAY);
    window.addEventListener("online", retry);
    return () => {
      clearInterval(id);
      window.removeEventListener("online", retry);
    };
  }, [failed, flush]);
}

/** T-192: serverga yetmagan javoblar telefonda: ilova qayta ochilsa ekranda turadi va qayta yuboriladi */
function useUnsaved(attempt: Answerable, base: string) {
  const [local] = useState(() => {
    const store = answerStore(base, attempt.id);
    return { store, map: store.load(attempt.questions.map((x) => x.question.id)) };
  });
  return local;
}

/**
 * Javoblar (`base` — "/attempts" yoki "/weekly-attempts"): ekranda darhol yangilanadi, serverga tanlovda darhol, yozuvda 0.8 soniyadan keyin saqlanadi.
 * Saqlanmagan javob navbatda qoladi va internet qaytganda yoki 5 soniyada qayta yuboriladi (T-150).
 * Bitta savolning so'rovlari ketma-ket ketadi: eski javob yangisining ustiga yozilmaydi.
 * flush() yuborilayotgan va kutilayotgan hamma javobni saqlaydi (topshirishdan oldin); saqlanmasa xato qaytaradi.
 */
export function useAnswers(attempt: Answerable, base: string) {
  const local = useUnsaved(attempt, base);
  const [values, setValues] = useState<Record<string, unknown>>(() => ({
    ...Object.fromEntries(attempt.questions.map((x) => [x.question.id, x.response])),
    ...Object.fromEntries(local.map),
  }));
  const [failed, setFailed] = useState(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<string, Response>(local.map));
  const inflight = useRef(new Map<string, Promise<void>>());
  const failing = useRef(new Set<string>());

  const send = useCallback(
    async (qid: string): Promise<void> => {
      await inflight.current.get(qid)?.catch(() => undefined);
      const r = pending.current.get(qid);
      if (!r) return;
      pending.current.delete(qid);
      const req = put(`${base}/${attempt.id}/answers/${qid}`, { response: r }).then(
        () => {
          failing.current.delete(qid);
          if (local.map.get(qid) === r) local.map.delete(qid);
          local.store.save(local.map);
        },
        (e: unknown) => {
          // Shu orada yangi javob yozilmagan bo'lsa, bu javob qayta yuboriladi
          if (!pending.current.has(qid)) pending.current.set(qid, r);
          failing.current.add(qid);
          throw e;
        },
      );
      inflight.current.set(qid, req);
      try {
        await req;
      } finally {
        if (inflight.current.get(qid) === req) inflight.current.delete(qid);
        setFailed(failing.current.size > 0);
      }
    },
    [attempt.id, base, local],
  );

  const set = (qid: string, r: Response, immediate: boolean) => {
    setValues((v) => ({ ...v, [qid]: r }));
    pending.current.set(qid, r);
    local.map.set(qid, r);
    local.store.save(local.map);
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
    await Promise.all([...inflight.current.values()].map((p) => p.catch(() => undefined)));
    await Promise.all([...pending.current.keys()].map(send));
  }, [send]);

  useBackgroundSave(flush, timers.current, failed);

  return { values, set, flush, failed };
}
