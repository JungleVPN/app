import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promo, PromoRedemption } from '@workspace/database';
import { PromoController } from './promo.controller';
import { PromoService } from './promo.service';

@Module({
  imports: [TypeOrmModule.forFeature([Promo, PromoRedemption])],
  controllers: [PromoController],
  providers: [PromoService],
  exports: [PromoService],
})
export class PromoModule {}
