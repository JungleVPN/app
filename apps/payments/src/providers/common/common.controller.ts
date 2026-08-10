import { Controller, Get } from '@nestjs/common';
import { type SubscriptionPlanDto } from '@workspace/types';
import { CommonService } from './common.service';

@Controller()
export class CommonController {
  constructor(private readonly commonService: CommonService) {}

  @Get('plans')
  getPlans(): SubscriptionPlanDto[] {
    return this.commonService.getPlans();
  }
}
