import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { internalKey, signInitData } from "@samarqand/shared/server";
import { E2E_OWNER } from "../playwright.config";
import { newTgId } from "./telegram";

const API = "http://127.0.0.1:4300/api";
const token = () => process.env.BOT_TOKEN ?? "";
const internal = () => ({ "x-internal-key": internalKey(token()) });

/** Bot /admin buyrug'idagidek bir martalik kirish havolasi */
export async function adminLink(request: APIRequestContext) {
  const res = await request.post(`${API}/internal/admin-login-link`, {
    headers: internal(),
    data: { id: newTgId(), first_name: "Ustoz", username: E2E_OWNER },
  });
  expect(res.ok()).toBe(true);
  const { url } = (await res.json()) as { url: string | null };
  expect(url).toContain("#t=");
  return url as string;
}

export async function loginAdmin(page: Page, request: APIRequestContext, path = "") {
  await page.goto(await adminLink(request));
  // Kirgandan keyin admin karkasi: telefonda menyu tugmasi, kompyuterda yon panel
  const shell = page
    .getByRole("button", { name: "Menyu", exact: true })
    .or(page.getByRole("navigation", { name: "Boʻlimlar" }));
  await expect(shell.first()).toBeVisible();
  if (path) await page.goto(`http://127.0.0.1:5191/admin/${path}`);
}

/** Admin JWT (API orqali kontent yaratish uchun) */
export async function adminHeaders(request: APIRequestContext) {
  const t = new URL(await adminLink(request)).hash.replace("#t=", "");
  const res = await request.post(`${API}/auth/admin-link`, { data: { token: t } });
  return { authorization: `Bearer ${((await res.json()) as { token: string }).token}` };
}

/** Bot raqamni qabul qilgandagidek (request_contact) */
export const sharePhone = (request: APIRequestContext, tg: number, phone: string) =>
  request.post(`${API}/internal/user-phone`, {
    headers: internal(),
    data: { from: { id: tg, first_name: "O" }, contact: { phone_number: phone, user_id: tg } },
  });

export async function apiPost<T>(
  request: APIRequestContext,
  path: string,
  headers: Record<string, string>,
  data: object,
) {
  const res = await request.post(`${API}${path}`, { headers, data });
  expect(res.ok(), `${path}: ${res.status()}`).toBe(true);
  return (await res.json()) as T;
}

/** Ilovani ochgan o'quvchi (API orqali): ism va telefon ixtiyoriy */
export async function createStudent(
  request: APIRequestContext,
  opts: { fullName?: string; phone?: string } = {},
) {
  const tg = newTgId();
  const user = JSON.stringify({ id: tg, first_name: "Oquvchi" });
  const initData = signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user }, token());
  const auth = (await (await request.post(`${API}/auth/telegram`, { data: { initData } })).json()) as {
    token: string;
  };
  const headers = { authorization: `Bearer ${auth.token}` };
  if (opts.fullName) await request.post(`${API}/me/name`, { headers, data: { fullName: opts.fullName } });
  if (opts.phone) await sharePhone(request, tg, opts.phone);
  return { tg, headers };
}

/** Ota-ona bot orqali ulanish so'rovini yuboradi */
export async function requestParentLink(request: APIRequestContext, studentTg: number, phone: string) {
  const { code } = (await (
    await request.post(`${API}/internal/parent-code`, {
      headers: internal(),
      data: { from: { id: studentTg, first_name: "O" } },
    })
  ).json()) as { code: string };
  const parent = { id: newTgId(), first_name: "Ota" };
  const res = await request.post(`${API}/internal/parent-link`, {
    headers: internal(),
    data: { code, from: parent, contact: { phone_number: phone, user_id: parent.id } },
  });
  expect(((await res.json()) as { status: string }).status).toBe("created");
  return parent;
}

/** Ustoz o'quvchiga FREE kirish beradi (to'lovsiz to'liq kirish) */
export async function grantFree(request: APIRequestContext, admin: Record<string, string>, fullName: string) {
  const res = await request.get(`${API}/admin/students?filter=all&q=${encodeURIComponent(fullName)}`, {
    headers: admin,
  });
  const [row] = (await res.json()) as { id: string }[];
  expect(row, fullName).toBeTruthy();
  const patch = await request.patch(`${API}/admin/students/${row?.id}`, {
    headers: admin,
    data: { accessMode: "FREE" },
  });
  expect(patch.ok()).toBe(true);
}

/** Admin bo'limiga o'tish: telefonda avval menyu ochiladi */
export async function adminNav(page: Page, label: string) {
  const menu = page.getByRole("button", { name: "Menyu", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Boʻlimlar" })
    .getByRole("link", { name: label, exact: true })
    .click();
}
