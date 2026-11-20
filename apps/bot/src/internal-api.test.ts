import { internalKey } from "@samarqand/shared/server";
import { describe, expect, it } from "vitest";
import { createInternalApi, profileOf } from "./internal-api";

describe("createInternalApi", () => {
  it("ichki kalit va profil bilan so'rov yuboradi", async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const fetchFn = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response(JSON.stringify({ url: "https://x/admin/login#t=abc" }));
    }) as unknown as typeof fetch;
    const api = createInternalApi({ baseUrl: "http://api/api/", botToken: "1:T", fetchFn });
    const res = await api.adminLoginLink({ id: 5, first_name: "U" });
    expect(res.url).toContain("#t=");
    expect(seen?.url).toBe("http://api/api/internal/admin-login-link");
    expect((seen?.init.headers as Record<string, string>)["x-internal-key"]).toBe(internalKey("1:T"));
  });

  it("raqamni o'z endpoint'iga yuboradi", async () => {
    let url = "";
    const fetchFn = (async (u: string) => {
      url = u;
      return new Response(JSON.stringify({ status: "saved" }));
    }) as unknown as typeof fetch;
    const api = createInternalApi({ baseUrl: "http://api", botToken: "1:T", fetchFn });
    const res = await api.userPhone({
      from: { id: 5, first_name: "U" },
      contact: { phone_number: "998", user_id: 5 },
    });
    expect(res.status).toBe("saved");
    expect(url).toBe("http://api/internal/user-phone");
  });

  it("API xato qaytarsa, xato tashlaydi", async () => {
    const fetchFn = (async () => new Response("", { status: 500 })) as unknown as typeof fetch;
    const api = createInternalApi({ baseUrl: "http://api", botToken: "1:T", fetchFn });
    await expect(api.adminLoginLink({ id: 5, first_name: "U" })).rejects.toThrow(/500/);
  });
});

describe("profileOf", () => {
  it("ortiqcha maydonlarni (is_bot va h.k.) tashlab yuboradi", () => {
    const from = { id: 1, first_name: "A", is_bot: false, language_code: "uz" };
    expect(profileOf(from)).toEqual({ id: 1, first_name: "A", last_name: undefined, username: undefined });
  });
});
