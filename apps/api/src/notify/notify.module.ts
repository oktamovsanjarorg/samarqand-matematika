import { Global, Module } from "@nestjs/common";
import { ENV, type Env } from "../config/env";
import { NotifyService } from "./notify.service";
import { TELEGRAM_TRANSPORT, botApiTransport, silentTransport } from "./telegram-transport";

@Global()
@Module({
  providers: [
    NotifyService,
    {
      provide: TELEGRAM_TRANSPORT,
      inject: [ENV],
      useFactory: (env: Env) =>
        env.NOTIFY_TRANSPORT === "off" ? silentTransport : botApiTransport(env.BOT_TOKEN),
    },
  ],
  exports: [NotifyService],
})
export class NotifyModule {}
