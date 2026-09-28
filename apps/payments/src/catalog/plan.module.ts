import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from '@workspace/database';
import { PlanService } from './plan.service';
import { VisitorCountryClient } from './visitor-country.client';
import { VisitorCurrencyService } from './visitor-currency.service';

@Module({
  imports: [TypeOrmModule.forFeature([Plan])],
  providers: [PlanService, VisitorCountryClient, VisitorCurrencyService],
  exports: [PlanService, VisitorCurrencyService],
})
export class PlanModule {}
