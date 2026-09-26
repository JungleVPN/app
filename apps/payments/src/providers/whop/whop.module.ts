import { Module } from '@nestjs/common';
import { PlanModule } from '@payments/catalog/plan.module';
import { PublicCheckoutRateLimitGuard } from '../../guards/public-checkout-rate-limit.guard';
import { WhopController } from './whop.controller';
import { WhopProvider } from './whop.provider';
import { WhopClientService } from './whop-client.service';

@Module({
  imports: [PlanModule],
  controllers: [WhopController],
  exports: [WhopProvider, WhopClientService],
  providers: [WhopClientService, WhopProvider, PublicCheckoutRateLimitGuard],
})
export class WhopModule {}
