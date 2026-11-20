import rateLimit from "@fastify/rate-limit";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { FastifyRequest } from "fastify";

/** main.ts va testlar uchun umumiy sozlash */
export async function configureApp(
  app: NestFastifyApplication,
  opts: { rateLimit: false } | { authPerMinute: number },
) {
  app.setGlobalPrefix("api");
  if ("rateLimit" in opts) return;
  // Bitta IP'dan daqiqasiga 600 so'rov, kirish (auth) uchun RATE_LIMIT_AUTH_PER_MIN (maktab Wi-Fi'da butun sinf bitta IP'da).
  // Haqiqiy IP proxy'dan X-Real-IP orqali keladi.
  const auth = opts.authPerMinute;
  await app.register(rateLimit as never, {
    timeWindow: "1 minute",
    max: (req: FastifyRequest) => (req.url.startsWith("/api/auth/") ? auth : 600),
    keyGenerator: (req: FastifyRequest) => String(req.headers["x-real-ip"] ?? req.ip),
    allowList: (req: FastifyRequest) => req.url === "/api/health",
    errorResponseBuilder: () => ({
      statusCode: 429,
      message: "Juda koʻp soʻrov. Bir daqiqadan keyin qayta urinib koʻring.",
    }),
  });
}
