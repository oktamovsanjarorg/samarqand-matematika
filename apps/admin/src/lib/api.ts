import type { AuthResponse } from "@samarqand/shared";
import { clearSession, loadSession } from "./session";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

/** Sessiya tugasa (401) ilova kirish sahifasiga qaytadi */
let onUnauthorized: () => void = () => undefined;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = loadSession()?.token;
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401 && token) {
      clearSession();
      onUnauthorized();
    }
    const body = (await res.json().catch(() => null)) as { message?: string; code?: string } | null;
    throw new ApiError(res.status, body?.message ?? "Xatolik yuz berdi", body?.code);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const send = (method: string) => (path: string, body?: object) =>
  request<unknown>(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: object) => send("POST")(path, body) as Promise<T>,
  patch: <T>(path: string, body: object) => send("PATCH")(path, body) as Promise<T>,
  put: <T>(path: string, body: object) => send("PUT")(path, body) as Promise<T>,
  del: (path: string) => send("DELETE")(path) as Promise<void>,
};

export const adminApi = {
  exchangeLink: (token: string) => api.post<AuthResponse>("/auth/admin-link", { token }),
};
