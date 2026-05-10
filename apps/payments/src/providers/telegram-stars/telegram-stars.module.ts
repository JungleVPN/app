import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsUtils } from '@payments/utils/utils';
import { TelegramStarsPayment } from '@workspace/database';
import { PaymentStatusModule } from '../../payment-status/payment-status.module';
import { TelegramStarsController } from './telegram-stars.controller';
import { TelegramStarsService } from './telegram-stars.service';

@Module({
  imports: [TypeOrmModule.forFeature([TelegramStarsPayment]), PaymentStatusModule],
  controllers: [TelegramStarsController],
  providers: [TelegramStarsService, PaymentsUtils],
  exports: [TelegramStarsService],
})
export class TelegramStarsModule {}
