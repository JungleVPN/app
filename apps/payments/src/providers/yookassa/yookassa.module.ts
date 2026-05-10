import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotNotificationModule } from '@payments/notifications/bot-notification.module';
import { YooKassaConnector } from '@payments/providers/yookassa/helpers/yookassa.connector';
import { YookassaController } from '@payments/providers/yookassa/yookassa.controller';
import { YooKassaProvider } from '@payments/providers/yookassa/yookassa.provider';
import { YookassaService } from '@payments/providers/yookassa/yookassa.service';
import { PaymentsUtils } from '@payments/utils/utils';
import { ValidatePaymentRequest } from '@payments/utils/validators';
import { SavedPaymentMethod, YookassaPayment } from '@workspace/database';
import { PaymentStatusModule } from '../../payment-status/payment-status.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([YookassaPayment, SavedPaymentMethod]),
    PaymentStatusModule,
    BotNotificationModule,
  ],
  controllers: [YookassaController],
  exports: [YooKassaProvider, YookassaService],
  providers: [
    YooKassaConnector,
    YooKassaProvider,
    YookassaService,
    ValidatePaymentRequest,
    PaymentsUtils,
  ],
})
export class YookassaModule {}
