import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ClientErrorBody } from "@samarqand/shared";
import { ENV, type Env } from "../config/env";
import { AlertGate } from "./alert-gate";
import { esc } from "./notify.service";
import { TELEGRAM_TRANSPORT, type TelegramTransport } from "./telegram-transport";

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/**
 * T-190: nosozliklar haqida dasturchiga (ALERT_TELEGRAM_IDS) Telegram xabari.
 * Hech qachon xato tashlamaydi va foydalanuvchi oqimini kutdirmaydi: xabar ketmasligi nosozlik emas.
 */
@Injectable()
export class AlertService {
  private readonly log = new Logger("Ogohlantirish");
  private readonly gate = new AlertGate();
  private readonly ids: bigint[];

  constructor(
    @Inject(TELEGRAM_TRANSPORT) private readonly transport: TelegramTransport,
    @Inject(ENV) env: Env,
  ) {
    this.ids = env.ALERT_TELEGRAM_IDS.split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map(BigInt);
  }

  /** Mini App yoki admin paneldagi xato. Logga ham yoziladi: chat xabari yetmasa ham iz qolsin */
  clientError(b: ClientErrorBody): void {
    this.log.warn(
      `Klient xatosi (${b.app}): ${cut(b.message, 200)} | sahifa=${b.page ?? "-"} | ${b.client ?? "-"}`,
    );
    const lines = [
      `⚠️ <b>Ilova xatosi</b> (${b.app})`,
      `<code>${esc(b.message)}</code>`,
      b.page ? `Sahifa: ${esc(b.page)}` : "",
      b.client ? `Klient: ${esc(b.client)}` : "",
      b.where ? `<pre>${esc(b.where)}</pre>` : "",
    ];
    this.send(`client|${b.app}|${b.message}`, lines.filter(Boolean).join("\n"));
  }

  /** Server 500 xatosi yoki ushlanmagan rad javobi: matn describeError'dan (shaxsiy ma'lumotsiz) */
  serverError(described: string): void {
    const head = described.split("\n").slice(0, 2).join("|");
    this.send(`server|${head}`, `🛑 <b>Server xatosi</b>\n<pre>${esc(cut(described, 1500))}</pre>`);
  }

  private send(key: string, html: string): void {
    if (!this.ids.length || !this.gate.allow(key)) return;
    for (const id of this.ids)
      this.transport.send(id, html).catch((e: unknown) => this.log.warn(`Xabar ketmadi: ${String(e)}`));
  }
}
