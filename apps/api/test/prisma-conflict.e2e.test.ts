import { Controller, Get } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { Prisma } from "@samarqand/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
});
