import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SavedPaymentMethod,
  StripePayment,
  TelegramStarsPayment,
  YookassaPayment,
} from '@workspace/database';
import { StripeClientService } from '@payments/providers/stripe/stripe-client.service';
import { StripeProvider } from '@payments/providers/stripe/stripe.provider';
import { StripeWebhookService } from '@payments/providers/stripe/stripe-webhook.service';
import { StripeController } from '@payments/providers/stripe/stripe.controller';
import { PaymentStatusModule } from '../../payment-status/payment-status.module';
import { PromoModule } from '../../promo/promo.module';

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
  ],
  controllers: [StripeController],
  exports: [StripeProvider, StripeWebhookService],
  providers: [StripeClientService, StripeProvider, StripeWebhookService],
})
export class StripeModule {}
