import { internalKey, type TelegramProfile } from "@samarqand/shared/server";

/** API'ning faqat bot chaqira oladigan endpoint'lari (x-internal-key: BOT_TOKEN'dan HMAC) */
export function createInternalApi(opts: { baseUrl: string; botToken: string; fetchFn?: typeof fetch }) {
  const base = opts.baseUrl.replace(/\/$/, "");
  const key = internalKey(opts.botToken);
  const doFetch = opts.fetchFn ?? fetch;

  async function post<T>(path: string, body: object): Promise<T> {
    const res = await doFetch(`${base}/internal/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return (await res.json()) as T;
  }

  return {
    adminLoginLink: (p: TelegramProfile) => post<{ url: string | null }>("admin-login-link", p),
  };
}

/** grammY ctx.from → API kutadigan profil (ortiqcha maydonlarsiz) */
export function profileOf(f: {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}): TelegramProfile {
  return { id: f.id, first_name: f.first_name, last_name: f.last_name, username: f.username };
}
