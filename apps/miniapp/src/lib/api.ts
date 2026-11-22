import type { AuthResponse, Me } from "@samarqand/shared";
import { useAuth } from "../store/auth";
import { getInitData } from "./telegram";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

async function parseError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as { message?: string; code?: string } | null;
  return new ApiError(res.status, body?.message ?? "Xatolik yuz berdi", body?.code);
}

/** T-150: tarmoq xatosi ("Failed to fetch") o'rniga o'zbekcha xabar; status 0 */
export const OFFLINE_MESSAGE = "Internetga ulanib boʻlmadi. Qayta urinib koʻring.";

async function request(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiError(0, OFFLINE_MESSAGE);
  }
}

/** initData orqali kirish: token va foydalanuvchi store'ga yoziladi */
export async function login(): Promise<Me> {
  const initData = getInitData();
  if (!initData) throw new ApiError(401, "Ilovani Telegram ichida oching");
  const res = await request("/api/auth/telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });
  if (!res.ok) throw await parseError(res);
  const auth = (await res.json()) as AuthResponse;
  useAuth.getState().setSession(auth.token, auth.user);
  return auth.user;
}

/** Token bilan so'rov; token eskirgan bo'lsa bir marta qayta kirib takrorlanadi */
export async function api<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const token = useAuth.getState().token;
  const res = await request(`/api${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401 && !retried) {
    await login();
    return api<T>(path, init, true);
  }
  if (!res.ok) throw await parseError(res);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const post = <T>(path: string, body?: object) =>
  api<T>(path, { method: "POST", ...(body ? { body: JSON.stringify(body) } : {}) });

export const put = <T>(path: string, body: object) =>
  api<T>(path, { method: "PUT", body: JSON.stringify(body) });

/** Himoyalangan fayl (rasm) — blob */
export async function apiBlob(path: string): Promise<Blob> {
  const token = useAuth.getState().token;
  const res = await request(`/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw await parseError(res);
  return res.blob();
}
