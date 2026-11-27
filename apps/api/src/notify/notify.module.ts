import { Global, Module } from "@nestjs/common";
import { ENV, type Env } from "../config/env";
import { AlertService } from "./alert.service";
import { NotifyService } from "./notify.service";
import { TELEGRAM_TRANSPORT, botApiTransport, rateLimited, silentTransport } from "./telegram-transport";

/** Telegram chegarasidan (30/s) biroz past: boshqa xabarlar (bot javoblari) uchun joy qoladi */
const SENDS_PER_SECOND = 25;

@Global()
@Module({
  providers: [
    NotifyService,
    AlertService,
    {
      provide: TELEGRAM_TRANSPORT,
      inject: [ENV],
      useFactory: (env: Env) =>
        env.NOTIFY_TRANSPORT === "off"
          ? silentTransport
          : rateLimited(botApiTransport(env.BOT_TOKEN), SENDS_PER_SECOND),
    },
  ],
  exports: [NotifyService, AlertService],
})
export class NotifyModule {}
