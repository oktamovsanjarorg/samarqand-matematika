import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { describeError } from "./common/safe-errors.filter";
import { loadEnv } from "./config/env";
import { AlertService } from "./notify/alert.service";
import { configureApp } from "./setup";

// BigInt (telegramId) JSON'ga aylantirilganda xato bermasligi uchun
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (this: bigint) {
  return this.toString();
};

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule.forRoot(env), new FastifyAdapter());
  await configureApp(app, { authPerMinute: env.RATE_LIMIT_AUTH_PER_MIN, perMinute: env.RATE_LIMIT_PER_MIN });
  app.enableCors({ origin: env.CORS_ORIGINS.split(",").map((s) => s.trim()) });
  // T-136: docker stop (SIGTERM): scheduler tick'i va boshlangan so'rovlar tugab, keyin chiqiladi
  app.enableShutdownHooks(["SIGTERM", "SIGINT"]);
  guardProcess(app.get(AlertService));
  await app.listen(env.API_PORT, env.API_HOST);
  console.info(`API: http://${env.API_HOST}:${env.API_PORT}/api`);
}

/**
 * T-190: "javobi kutilmaydigan" chaqiruv (xabar, AI) yiqilsa Node butun jarayonni to'xtatadi va boshqa
 * o'quvchilarning so'rovlari ham uziladi. Rad javobi logga va dasturchiga yoziladi, jarayon tirik qoladi.
 * Ushlanmagan istisnoda holat buzilgan bo'lishi mumkin: yozib chiqiladi, Docker qayta ko'taradi.
 */
function guardProcess(alerts: AlertService) {
  process.on("unhandledRejection", (reason) => {
    const d = describeError(reason);
    console.error(`Ushlanmagan rad javobi: ${d}`);
    alerts.serverError(d);
  });
  process.on("uncaughtException", (e) => {
    console.error(`Ushlanmagan istisno: ${describeError(e)}`);
    process.exit(1);
  });
}

void bootstrap();
