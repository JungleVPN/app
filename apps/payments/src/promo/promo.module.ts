import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from '@payments/admin/admin.module';
import { AnalyticsClientModule } from '@payments/analytics/analytics-client.module';
import { Promo, PromoRedemption } from '@workspace/database';
import { PromoController } from './promo.controller';
import { PromoService } from './promo.service';

@Module({
  imports: [TypeOrmModule.forFeature([Promo, PromoRedemption]), AdminModule, AnalyticsClientModule],
  controllers: [PromoController],
  providers: [PromoService],
  exports: [PromoService],
})
export class PromoModule {}
