import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsClientModule } from '@payments/analytics/analytics-client.module';
import { BotNotificationModule } from '@payments/notifications/bot-notification.module';
import { YooKassaConnector } from '@payments/providers/yookassa/helpers/yookassa.connector';
import { YookassaController } from '@payments/providers/yookassa/yookassa.controller';
import { YooKassaProvider } from '@payments/providers/yookassa/yookassa.provider';
import { YookassaService } from '@payments/providers/yookassa/yookassa.service';
import { PaymentsUtils } from '@payments/utils/utils';
import { SavedPaymentMethod, YookassaPayment } from '@workspace/database';
import { PaymentStatusModule } from '../../payment-status/payment-status.module';
import { PromoModule } from '../../promo/promo.module';
import { ToltModule } from '../../tolt/tolt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([YookassaPayment, SavedPaymentMethod]),
    PaymentStatusModule,
    PromoModule,
    BotNotificationModule,
    AnalyticsClientModule,
    ToltModule,
  ],
  controllers: [YookassaController],
  exports: [YooKassaProvider, YookassaService],
  providers: [YooKassaConnector, YooKassaProvider, YookassaService, PaymentsUtils],
})
export class YookassaModule {}
