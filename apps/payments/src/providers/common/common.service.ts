import { Injectable } from '@nestjs/common';
import {
  buildPlanPricing,
  type Currency,
  enabledPeriodMonths,
  getPriceForPeriod,
} from '@payments/utils/amount';
import { PaymentsUtils } from '@payments/utils/utils';
import { type SubscriptionPlanDto } from '@workspace/types';

@Injectable()
export class CommonService {
  constructor(private readonly paymentsUtils: PaymentsUtils) {}

  getPlans(): SubscriptionPlanDto[] {
    const periods = enabledPeriodMonths();
    const starsAmounts = this.paymentsUtils.getAllowedStarsAmounts();
    const basePriceRub = this.getBasePrice('RUB', periods);
    const basePriceEur = this.getBasePrice('EUR', periods);

    return periods
      .map((months, i) => {
        try {
          const priceRub = getPriceForPeriod('RUB', months);
          const priceEur = getPriceForPeriod('EUR', months);

          return {
            months,
            priceRub,
            priceEur,
            priceStars: starsAmounts[i] ?? 0,
            rub: buildPlanPricing('RUB', months, Number(priceRub), basePriceRub),
            eur: buildPlanPricing('EUR', months, Number(priceEur), basePriceEur),
          } satisfies SubscriptionPlanDto;
        } catch {
          return null;
        }
      })
      .filter((plan): plan is SubscriptionPlanDto => plan !== null);
  }

  private getBasePrice(currency: Currency, periods: number[]): number | null {
    if (!periods.includes(1)) return null;
    try {
      return Number(getPriceForPeriod(currency, 1));
    } catch {
      return null;
    }
  }
}
