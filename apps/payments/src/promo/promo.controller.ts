import { Body, Controller, Post } from '@nestjs/common';
import type { ValidatePromoDto, ValidatePromoResponse } from '@workspace/types';
import { PromoService } from './promo.service';

@Controller('promo')
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  /**
   * Live validation for the payment page. Advisory only — the binding check
   * happens when the payment settles (PromoService.applyToMonths).
   */
  @Post('validate')
  validate(@Body() body: ValidatePromoDto): Promise<ValidatePromoResponse> {
    return this.promoService.validate(body);
  }
}
