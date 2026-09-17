import type { PlanPricing } from '@workspace/types';
import { formatPlanPrice } from '../../../../utils';

export type SelectedPlan = { period: number; pricing: PlanPricing };

/**
 * The pay button's label. The price is already quoted in the currency this
 * visitor will be charged, whichever provider ends up taking the payment —
 * so the label no longer varies by method.
 */
export function getButtonLabel(
  selectedPlan: SelectedPlan,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  return t('payment.planPriceButton', {
    price: formatPlanPrice(selectedPlan.pricing, selectedPlan.pricing.total),
    count: selectedPlan.period,
  });
}
