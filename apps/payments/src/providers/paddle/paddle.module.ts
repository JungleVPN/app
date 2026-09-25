import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsClientModule } from '@payments/analytics/analytics-client.module';
import { PlanModule } from '@payments/catalog/plan.module';
import { PaddlePayment, SavedPaymentMethod } from '@workspace/database';
import { PublicCheckoutRateLimitGuard } from '../../guards/public-checkout-rate-limit.guard';
import { PaymentStatusModule } from '../../payment-status/payment-status.module';
import { ToltModule } from '../../tolt/tolt.module';
import { PaddleController } from './paddle.controller';
import { PaddleProvider } from './paddle.provider';
import { PaddleClientService } from './paddle-client.service';
import { PaddleWebhookService } from './paddle-webhook.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaddlePayment, SavedPaymentMethod]),
    PaymentStatusModule,
    AnalyticsClientModule,
    ToltModule,
    PlanModule,
  ],
  controllers: [PaddleController],
  exports: [PaddleProvider, PaddleWebhookService, PaddleClientService],
  providers: [
    PaddleClientService,
    PaddleProvider,
    PaddleWebhookService,
    PublicCheckoutRateLimitGuard,
  ],
})
export class PaddleModule {}
