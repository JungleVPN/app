import type { PaymentMethod } from '@workspace/types';

export type SelectedPlan = { months: number; priceEur: number; priceRub: number };

export function getButtonLabel(
  method: PaymentMethod,
  selectedPlan: SelectedPlan,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  switch (method) {
    case 'yookassa':
      return t('payment.planPriceRubButton', {
        amount: selectedPlan.priceRub,
        count: selectedPlan.months,
      });
    case 'stripe':
    case 'stars':
      return t('payment.planPriceEurButton', {
        amount: selectedPlan.priceEur,
        count: selectedPlan.months,
      });
  }
}
