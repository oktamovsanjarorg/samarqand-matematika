import { Module } from "@nestjs/common";
import { AdminBillingController } from "./admin-billing.controller";
import { AdminPaymentsService } from "./admin-payments.service";
import { BillingController } from "./billing.controller";
import { PaymentsService } from "./payments.service";
import { PlansService } from "./plans.service";
import { ReceiptStore } from "./receipts";

@Module({
  controllers: [BillingController, AdminBillingController],
  providers: [PlansService, PaymentsService, AdminPaymentsService, ReceiptStore],
})
export class BillingModule {}
