import { Controller, Get, Logger } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { Prisma } from "@samarqand/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Public } from "../src/auth/decorators";
import { createApp } from "./helpers";

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("x", { code, clientVersion: Prisma.prismaVersion.client });

@Controller("test-prisma")
class ThrowingController {
  @Public()
  @Get("fk")
  fk() {
    throw prismaError("P2003");
  }

  @Public()
  @Get("unique")
  unique() {
    throw prismaError("P2002");
  }

  @Public()
  @Get("gone")
  gone() {
    throw prismaError("P2025");
  }

  @Public()
  @Get("validation")
  validation() {
    // Prisma validatsiya xatosi matnida argumentlar bo'ladi (T-141)
    throw new Prisma.PrismaClientValidationError(
      'Invalid invocation: firstName: "MaxfiyIsm", phone: 998901234567',
      {
        clientVersion: Prisma.prismaVersion.client,
      },
    );
  }

  @Public()
  @Get("plain")
  plain() {
    throw new Error("ichki xato: MaxfiyIsm");
  }

  @Public()
  @Get("other")
  other() {
    throw prismaError("P2010");
  }
}

let app: NestFastifyApplication;
beforeAll(async () => {
  app = await createApp([ThrowingController]);
});
afterAll(async () => {
  await app.close();
});

describe("Prisma zaxira filtri (T-095, T-107)", () => {
  it("FK cheklovi 409 va tushunarli matn; boshqa Prisma xatosi 500 bo'lib qoladi", async () => {
    const fk = await app.inject({ method: "GET", url: "/api/test-prisma/fk" });
    expect(fk.statusCode).toBe(409);
    expect(fk.json().message).toContain("ishlatilgan");
    // T-107: poyga holatlari
    const unique = await app.inject({ method: "GET", url: "/api/test-prisma/unique" });
    expect(unique.statusCode).toBe(409);
    expect(unique.json().message).toContain("allaqachon bor");
    const gone = await app.inject({ method: "GET", url: "/api/test-prisma/gone" });
    expect(gone.statusCode).toBe(404);
    expect(gone.json().message).toContain("topilmadi");
    const other = await app.inject({ method: "GET", url: "/api/test-prisma/other" });
    expect(other.statusCode).toBe(500);
  });

  it("T-141: kutilmagan xato 500, logga xabar matni (shaxsiy ma'lumot) tushmaydi", async () => {
    const logged: string[] = [];
    const spy = vi.spyOn(Logger.prototype, "error").mockImplementation((m: unknown) => {
      logged.push(String(m));
    });
    try {
      for (const path of ["validation", "plain", "other"]) {
        const res = await app.inject({ method: "GET", url: `/api/test-prisma/${path}` });
        expect(res.statusCode).toBe(500);
        expect(res.body).not.toContain("MaxfiyIsm");
      }
      expect(logged).toHaveLength(3);
      expect(logged.join("\n")).not.toContain("MaxfiyIsm");
      expect(logged.join("\n")).not.toContain("998901234567");
      expect(logged[0]).toMatch(/^PrismaClientValidationError\n\s+at /);
      expect(logged[2]).toMatch(/^PrismaClientKnownRequestError P2010/);
    } finally {
      spy.mockRestore();
    }
  });
});
