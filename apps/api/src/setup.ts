import rateLimit from "@fastify/rate-limit";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { MAX_RECEIPT_BYTES, RECEIPT_TYPES } from "@samarqand/shared";
import type { FastifyRequest } from "fastify";

/** main.ts va testlar uchun umumiy sozlash */
export async function configureApp(
  app: NestFastifyApplication,
  opts: { rateLimit: false } | { authPerMinute: number; perMinute: number },
) {
  app.setGlobalPrefix("api");
  // Chek rasmi tanasi xom bayt bo'lib keladi (multipart'siz): turi baytlardan ham tekshiriladi
  app
    .getHttpAdapter()
    .getInstance()
    .addContentTypeParser(
      [...RECEIPT_TYPES],
      { parseAs: "buffer", bodyLimit: MAX_RECEIPT_BYTES },
      (_req, body, done) => done(null, body),
    );
  if ("rateLimit" in opts) return;
  // Bitta IP'dan daqiqasiga RATE_LIMIT_PER_MIN so'rov, kirish (auth) uchun RATE_LIMIT_AUTH_PER_MIN (maktab Wi-Fi'da butun sinf bitta IP'da).
  // Haqiqiy IP proxy'dan X-Real-IP orqali keladi.
  const { authPerMinute: auth, perMinute } = opts;
  await app.register(rateLimit as never, {
    timeWindow: "1 minute",
    max: (req: FastifyRequest) => (req.url.startsWith("/api/auth/") ? auth : perMinute),
    keyGenerator: (req: FastifyRequest) => String(req.headers["x-real-ip"] ?? req.ip),
    allowList: (req: FastifyRequest) => req.url === "/api/health",
    errorResponseBuilder: () => ({
      statusCode: 429,
      message: "Juda koʻp soʻrov. Bir daqiqadan keyin qayta urinib koʻring.",
    }),
  });
}
