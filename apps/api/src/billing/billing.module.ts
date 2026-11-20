import { Module } from "@nestjs/common";
import { AdminBillingController } from "./admin-billing.controller";
import { AdminPaymentsService } from "./admin-payments.service";
import { BillingController } from "./billing.controller";
import { PaymentsService } from "./payments.service";
import { PlansService } from "./plans.service";
import { MediaModule } from "../storage/media.module";

@Module({
  imports: [MediaModule],
  controllers: [BillingController, AdminBillingController],
  providers: [PlansService, PaymentsService, AdminPaymentsService],
})
export class BillingModule {}
