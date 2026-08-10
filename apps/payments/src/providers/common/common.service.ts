import { Injectable } from '@nestjs/common';
import { enabledPeriodMonths, getPriceForPeriod } from '@payments/utils/amount';
import { PaymentsUtils } from '@payments/utils/utils';
import { type SubscriptionPlanDto } from '@workspace/types';

@Injectable()
export class CommonService {
  constructor(private readonly paymentsUtils: PaymentsUtils) {}

  getPlans(): SubscriptionPlanDto[] {
    const periods = enabledPeriodMonths();
    const starsAmounts = this.paymentsUtils.getAllowedStarsAmounts();

    return periods
      .map((months, i) => {
        try {
          return {
            months,
            priceRub: getPriceForPeriod('RUB', months),
            priceEur: getPriceForPeriod('EUR', months),
            priceStars: starsAmounts[i] ?? 0,
          } satisfies SubscriptionPlanDto;
        } catch {
          return null;
        }
      })
      .filter((plan): plan is SubscriptionPlanDto => plan !== null);
  }
}
