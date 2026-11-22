import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

/**
 * T-153: saqlanmagan tahrir brauzerda (localStorage) turadi. Sessiya tugab panel kirish sahifasiga o'tsa,
 * sahifa yangilansa yoki yopilsa ham yozilgan matn yo'qolmaydi: qayta ochilganda tiklanadi.
 * Qoralama faqat serverdagi nusxa o'zgarmagan bo'lsa tiklanadi (`base`), 14 kundan eskisi o'chadi.
 */
const PREFIX = "samarqand-draft:";
const MAX_AGE_MS = 14 * 24 * 3_600_000;

interface Stored<T> {
  base: string;
  at: number;
  draft: T;
}

function read<T>(key: string, base: string, now = Date.now()): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored<T>;
    if (s.base === base && now - s.at < MAX_AGE_MS) return s.draft;
    localStorage.removeItem(PREFIX + key);
  } catch {
    // localStorage yo'q (yashirin rejim) yoki buzilgan yozuv: qoralamasiz ishlaydi
  }
  return null;
}

function write(key: string, value: Stored<unknown> | null) {
  try {
    if (value) localStorage.setItem(PREFIX + key, JSON.stringify(value));
    else localStorage.removeItem(PREFIX + key);
  } catch {
    // e'tiborsiz: qoralama faqat qulaylik
  }
}

export interface LocalDraft<T> {
  value: T;
  set: Dispatch<SetStateAction<T>>;
  /** Sahifa ochilganda oldingi saqlanmagan o'zgarish tiklandi */
  restored: boolean;
  /** Tiklangan o'zgarishni tashlab, serverdagi nusxaga qaytish */
  discard: () => void;
  /** Saqlangach qoralamani o'chirish (sahifadan chiqib ketiladigan holat) */
  clear: () => void;
}

/** `server` — serverdagi nusxa; u o'zgarsa (saqlandi yoki qayta yuklandi) tahrir ham unga tenglashadi */
export function useLocalDraft<T>(key: string, server: T): LocalDraft<T> {
  const base = JSON.stringify(server);
  const [initial] = useState(() => read<T>(key, base));
  const [value, set] = useState<T>(initial ?? server);
  const [restored, setRestored] = useState(initial !== null);
  const seen = useRef(base);
  const cleared = useRef(false);

  useEffect(() => {
    if (seen.current === base) return;
    seen.current = base;
    set(server);
    setRestored(false);
  }, [base, server]);

  useEffect(() => {
    if (cleared.current) return;
    const changed = JSON.stringify(value) !== base;
    write(key, changed ? { base, at: Date.now(), draft: value } : null);
  }, [key, base, value]);

  const discard = useCallback(() => {
    set(server);
    setRestored(false);
  }, [server]);
  const clear = useCallback(() => {
    cleared.current = true;
    write(key, null);
  }, [key]);
  return { value, set, restored, discard, clear };
}
