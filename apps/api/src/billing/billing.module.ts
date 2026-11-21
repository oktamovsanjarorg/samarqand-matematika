import { Module } from "@nestjs/common";
import { AdminBillingController } from "./admin-billing.controller";
import { AdminPaymentsService } from "./admin-payments.service";
import { BillingController } from "./billing.controller";
import { IncomeService } from "./income.service";
import { PaymentsService } from "./payments.service";
import { PlansService } from "./plans.service";
import { MediaModule } from "../storage/media.module";
import { SubscriptionReminders } from "./subscription-reminders";

@Module({
  imports: [MediaModule],
  controllers: [BillingController, AdminBillingController],
  providers: [PlansService, PaymentsService, AdminPaymentsService, IncomeService, SubscriptionReminders],
})
export class BillingModule {}
