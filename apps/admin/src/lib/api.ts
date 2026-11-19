import type { AuthResponse } from "@samarqand/shared";
import { clearSession, loadSession } from "./session";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

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
    if (res.status === 401 && token) clearSession();
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(res.status, body?.message ?? "Xatolik yuz berdi");
  }
  return (await res.json()) as T;
}

export const adminApi = {
  exchangeLink: (token: string) =>
    request<AuthResponse>("/auth/admin-link", { method: "POST", body: JSON.stringify({ token }) }),
};
