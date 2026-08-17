import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsClientModule } from '@payments/analytics/analytics-client.module';
import { StripeController } from '@payments/providers/stripe/stripe.controller';
import { StripeProvider } from '@payments/providers/stripe/stripe.provider';
import { StripeClientService } from '@payments/providers/stripe/stripe-client.service';
import { StripeWebhookService } from '@payments/providers/stripe/stripe-webhook.service';
import {
  SavedPaymentMethod,
  StripePayment,
  TelegramStarsPayment,
  YookassaPayment,
} from '@workspace/database';
import { PaymentStatusModule } from '../../payment-status/payment-status.module';
import { PromoModule } from '../../promo/promo.module';
import { ToltModule } from '../../tolt/tolt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StripePayment,
      SavedPaymentMethod,
      YookassaPayment,
      TelegramStarsPayment,
    ]),
    PaymentStatusModule,
    PromoModule,
    AnalyticsClientModule,
    ToltModule,
  ],
  controllers: [StripeController],
  exports: [StripeProvider, StripeWebhookService],
  providers: [StripeClientService, StripeProvider, StripeWebhookService],
})
export class StripeModule {}
