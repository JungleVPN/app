import { Injectable } from '@nestjs/common';
import type { PlanProvider } from '@workspace/database';
import { currencyForCountry } from './country-currency';
import { PlanService } from './plan.service';
import { providerCurrency } from './plan-provider';
import { VisitorCountryClient } from './visitor-country.client';

export interface VisitorCurrency {
  currency: string;
  /** The visitor's country, when it had to be looked up. */
  countryCode: string | null;
}

/**
 * The currency a visitor is priced and charged in at `provider`: their
 * country's, when the provider has plans on sale in it, otherwise the
 * provider's default. `/plans` and checkout both ask this, so a payer is
 * charged in the currency they were shown.
 */
@Injectable()
export class VisitorCurrencyService {
  constructor(
    private readonly planService: PlanService,
    private readonly countryClient: VisitorCountryClient,
  ) {}

  async resolve({
    provider,
    clientIp,
  }: {
    provider: PlanProvider;
    clientIp: string | null;
  }): Promise<VisitorCurrency> {
    const onSale = await this.planService.currenciesForSale(provider);
    if (onSale.length <= 1) {
      return { currency: onSale[0] ?? providerCurrency(provider), countryCode: null };
    }

    const countryCode = await this.countryClient.countryOf(clientIp);
    const local = currencyForCountry(countryCode);

    return {
      currency: local !== null && onSale.includes(local) ? local : providerCurrency(provider),
      countryCode,
    };
  }
}
