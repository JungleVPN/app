import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import {
  type PublicPromosResponse,
  scopeForOrigin,
  type ValidatePromoDto,
  type ValidatePromoResponse,
} from '@workspace/types';
import { PromoService } from './promo.service';

/** `?featured=true|false` as a boolean; anything else means "don't filter". */
function parseFeatured(value: string | undefined): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

@Controller('promo')
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  /**
   * Usable promos of the caller's storefront; `?featured=true` narrows them to
   * the ones the checkout advertises. Public: the payer has no account yet, so
   * `Origin` picks the storefront (RU vs. global).
   */
  @Get()
  async list(
    @Query('featured') featured?: string,
    @Headers('origin') origin?: string,
  ): Promise<PublicPromosResponse> {
    const scope = scopeForOrigin(origin, process.env.PUBLIC_DOMAIN_RU);
    const featuredFilter = parseFeatured(featured);
    const promos = await this.promoService.listAvailable(
      featuredFilter === undefined ? { scope } : { scope, featured: featuredFilter },
    );
    return { promos };
  }

  /**
   * Live validation for the payment page. Advisory only — the binding check
   * happens when the payment settles (PromoService.applyToMonths).
   */
  @Post('validate')
  validate(@Body() body: ValidatePromoDto): Promise<ValidatePromoResponse> {
    return this.promoService.validate(body);
  }
}
