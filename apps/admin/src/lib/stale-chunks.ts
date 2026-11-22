const KEY = "stale-reload-at";

/**
 * Deploydan keyin ochiq qolgan sahifa eski chunk'ni so'raydi va u serverda endi yo'q (T-131, T-132).
 * Vite `vite:preloadError` beradi: sahifani bir marta qayta yuklaymiz, yangi index.html yangi chunk'larni oladi.
 * 10 soniya ichida takror bo'lsa yuklamaymiz: cheksiz aylanish bo'lmasin.
 */
export function reloadOnStaleChunks(): void {
  window.addEventListener("vite:preloadError", (event) => {
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(KEY) ?? 0);
    } catch {
      // saqlash yopiq bo'lsa ham bir marta qayta yuklaymiz
    }
    if (Date.now() - last < 10_000) return;
    try {
      sessionStorage.setItem(KEY, String(Date.now()));
    } catch {
      // e'tiborsiz
    }
    event.preventDefault();
    window.location.reload();
  });
}
