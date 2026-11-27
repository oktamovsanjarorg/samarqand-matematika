import { Controller, Get } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Public } from "../src/auth/decorators";
import { ALERT_ID, createApp, OWNER_ID, sentMessages } from "./helpers";

@Controller("test-boom")
class BoomController {
  @Public()
  @Get()
  boom(): never {
    throw new Error("Aziz Karimov 998901234567 bilan nimadir buzildi");
  }
}

let app: NestFastifyApplication;
beforeAll(async () => {
  app = await createApp([BoomController]);
});
afterAll(() => app.close());

const toAlert = () => sentMessages.filter((m) => m.chatId === BigInt(ALERT_ID)).map((m) => m.html);
const report = (payload: object) => app.inject({ method: "POST", url: "/api/client-errors", payload });

describe("Ilova va server xatolari dasturchiga (T-190)", () => {
  it("tokensiz qabul qilinadi, dasturchiga boradi, bir xil xato bir marta, ustozga bormaydi", async () => {
    const before = toAlert().length;
    const owner = sentMessages.filter((m) => m.chatId === BigInt(OWNER_ID)).length;
    const body = {
      app: "miniapp",
      message: "TypeError: x <b>undefined</b>",
      page: "/weekly",
      client: "android 9.1",
    };
    expect((await report(body)).statusCode).toBe(204);
    expect((await report(body)).statusCode).toBe(204);
    const got = toAlert().slice(before);
    expect(got).toHaveLength(1);
    expect(got[0]).toContain("Ilova xatosi");
    expect(got[0]).toContain("/weekly");
    expect(got[0]).toContain("&lt;b&gt;undefined&lt;/b&gt;");
    expect(sentMessages.filter((m) => m.chatId === BigInt(OWNER_ID))).toHaveLength(owner);
  });

  it("noto'g'ri yoki juda uzun tavsif 400", async () => {
    expect((await report({ app: "boshqa", message: "x" })).statusCode).toBe(400);
    expect((await report({ app: "admin", message: "x".repeat(301) })).statusCode).toBe(400);
    expect((await report({ app: "admin" })).statusCode).toBe(400);
  });

  it("server 500 xatosi dasturchiga, xabar matni (shaxsiy ma'lumot) yuborilmaydi", async () => {
    const before = toAlert().length;
    const res = await app.inject({ method: "GET", url: "/api/test-boom" });
    expect(res.statusCode).toBe(500);
    const got = toAlert().slice(before);
    expect(got).toHaveLength(1);
    expect(got[0]).toContain("Server xatosi");
    expect(got[0]).not.toContain("998901234567");
    expect(got[0]).not.toContain("Aziz");
  });
});
