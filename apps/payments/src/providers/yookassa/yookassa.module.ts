import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsClientModule } from '@payments/analytics/analytics-client.module';
import { PlanModule } from '@payments/catalog/plan.module';
import { BotNotificationModule } from '@payments/notifications/bot-notification.module';
import { YooKassaConnector } from '@payments/providers/yookassa/helpers/yookassa.connector';
import { YookassaController } from '@payments/providers/yookassa/yookassa.controller';
import { YooKassaProvider } from '@payments/providers/yookassa/yookassa.provider';
import { YookassaService } from '@payments/providers/yookassa/yookassa.service';
import { PaymentsUtils } from '@payments/utils/utils';
import { SavedPaymentMethod, YookassaPayment } from '@workspace/database';
import { AdminModule } from '../../admin/admin.module';
import { PublicCheckoutRateLimitGuard } from '../../guards/public-checkout-rate-limit.guard';
import { PaymentStatusModule } from '../../payment-status/payment-status.module';
import { PromoModule } from '../../promo/promo.module';
import { ToltModule } from '../../tolt/tolt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([YookassaPayment, SavedPaymentMethod]),
    PaymentStatusModule,
    AdminModule,
    PromoModule,
    BotNotificationModule,
    AnalyticsClientModule,
    ToltModule,
    PlanModule,
  ],
  controllers: [YookassaController],
  exports: [YooKassaProvider, YookassaService],
  providers: [
    YooKassaConnector,
    YooKassaProvider,
    YookassaService,
    PaymentsUtils,
    PublicCheckoutRateLimitGuard,
  ],
})
export class YookassaModule {}
