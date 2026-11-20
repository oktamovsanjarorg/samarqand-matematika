import { Global, Module } from "@nestjs/common";
import { ENV, type Env } from "../config/env";
import { NotifyService } from "./notify.service";
import { TELEGRAM_TRANSPORT, botApiTransport } from "./telegram-transport";

@Global()
@Module({
  providers: [
    NotifyService,
    { provide: TELEGRAM_TRANSPORT, inject: [ENV], useFactory: (env: Env) => botApiTransport(env.BOT_TOKEN) },
  ],
  exports: [NotifyService],
})
export class NotifyModule {}
