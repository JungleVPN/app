import { Module } from '@nestjs/common';
import { PromoModule } from '@payments/promo/promo.module';
import { PaymentStatusService } from './payment-status.service';

@Module({
  imports: [PromoModule],
  providers: [PaymentStatusService],
  exports: [PaymentStatusService],
})
export class PaymentStatusModule {}
