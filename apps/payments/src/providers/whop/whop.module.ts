import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsClientModule } from '@payments/analytics/analytics-client.module';
import { PlanModule } from '@payments/catalog/plan.module';
import { SavedPaymentMethod, WhopPayment, WhopRefund } from '@workspace/database';
import { PublicCheckoutRateLimitGuard } from '../../guards/public-checkout-rate-limit.guard';
import { PaymentStatusModule } from '../../payment-status/payment-status.module';
import { ToltModule } from '../../tolt/tolt.module';
import { WhopController } from './whop.controller';
import { WhopProvider } from './whop.provider';
import { WhopClientService } from './whop-client.service';
import { WhopWebhookService } from './whop-webhook.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhopPayment, WhopRefund, SavedPaymentMethod]),
    PaymentStatusModule,
    AnalyticsClientModule,
    ToltModule,
    PlanModule,
  ],
  controllers: [WhopController],
  exports: [WhopProvider, WhopWebhookService, WhopClientService],
  providers: [WhopClientService, WhopProvider, WhopWebhookService, PublicCheckoutRateLimitGuard],
})
export class WhopModule {}
