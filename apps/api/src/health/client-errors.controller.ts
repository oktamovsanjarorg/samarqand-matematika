import { BadRequestException, Body, Controller, HttpCode, Post } from "@nestjs/common";
import { clientErrorBody } from "@samarqand/shared";
import { Public } from "../auth/decorators";
import { AlertService } from "../notify/alert.service";

/**
 * T-190: Mini App va admin paneldagi xatolar. Ochiq endpoint: xato aynan kirish paytida bo'lishi mumkin
 * (token hali yo'q). Bazaga hech narsa yozilmaydi, matn qisqa (Zod), shovqin AlertGate bilan cheklangan,
 * IP bo'yicha umumiy rate-limit ham ishlaydi.
 */
@Controller("client-errors")
export class ClientErrorsController {
  constructor(private readonly alerts: AlertService) {}

  @Public()
  @Post()
  @HttpCode(204)
  report(@Body() body: unknown): void {
    const parsed = clientErrorBody.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Xato tavsifi notoʻgʻri");
    this.alerts.clientError(parsed.data);
  }
}
