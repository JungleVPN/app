import { Injectable } from '@nestjs/common';
import { getConfiguredAmounts } from '@payments/utils/amount';
import { PaymentsUtils } from '@payments/utils/utils';
import { type SubscriptionPlanDto } from '@workspace/types';

@Injectable()
export class CommonService {
  constructor(private readonly paymentsUtils: PaymentsUtils) {}

  getPlans(): SubscriptionPlanDto[] {
    const periods = this.paymentsUtils.getAllowedPeriods();
    const rubAmounts = this.paymentsUtils.getAllowedAmounts();
    const eurAmounts = getConfiguredAmounts('EUR');
    const starsAmounts = this.paymentsUtils.getAllowedStarsAmounts();

    return periods.map((months, i) => ({
      months,
      priceRub: rubAmounts[i] ?? rubAmounts[0] ?? '0',
      priceEur: eurAmounts[i] ?? eurAmounts[0] ?? '0',
      priceStars: starsAmounts[i] ?? starsAmounts[0] ?? 0,
    }));
  }
}
