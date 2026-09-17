import { Controller, Get, Headers, Ip } from '@nestjs/common';
import { type SubscriptionPlanDto } from '@workspace/types';
import { CommonService } from './common.service';

@Controller('')
export class CommonController {
  constructor(private readonly commonService: CommonService) {}

  /**
   * Plans priced for this caller. `Origin` picks the storefront (RU vs.
   * global) and the IP lets the global provider quote a local currency —
   * both read from the request, so the client sends nothing and learns
   * nothing about which provider will take the payment.
   */
  @Get('plans')
  async getPlans(
    @Ip() ip: string,
    @Headers('origin') origin?: string,
  ): Promise<SubscriptionPlanDto[]> {
    return this.commonService.getPlans({ origin: origin ?? null, clientIp: ip || null });
  }
}
