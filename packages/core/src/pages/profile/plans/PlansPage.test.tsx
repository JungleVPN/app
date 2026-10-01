/**
 * PlansPage (profile) — picking a plan before paying. Plan lengths are in days.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import type { SubscriptionPlanDto } from '@workspace/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlansPage from './PlansPage';

const { phCapture, navigate } = vi.hoisted(() => ({ phCapture: vi.fn(), navigate: vi.fn() }));

const plan = (days: number): SubscriptionPlanDto => ({
  planId: `plan-${days}`,
  days,
  countryCode: null,
  isTrial: false,
  planPricing: {
    total: '10.00',
    monthly: '10.00',
    fullTotal: null,
    discountPercent: 0,
    currencyCode: 'EUR',
  },
});

vi.mock('../../../components', () => ({ Loading: () => null }));
vi.mock('../../../hooks', () => ({
  useNavigation: () => navigate,
  usePlans: () => [plan(30), plan(365)],
}));
vi.mock('../../../runtime', () => ({
  useAppRoutes: () => ({ profilePaymentPath: '/profile/payments' }),
}));
vi.mock('../../../utils', async () => {
  const { mapPlans } = await import('../../../utils/planPricing');
  return { mapPlans, phCapture };
});
vi.mock('../payment/hooks/useSavedPayment', () => ({
  useSavedPayment: () => ({ hasActiveMethod: false, isLoading: false }),
}));
vi.mock('./PlansComponent', () => ({
  PlansComponent: ({ onSubmit }: { onSubmit: () => void }) => (
    <button type='button' onClick={onSubmit}>
      continue
    </button>
  ),
}));

describe('PlansPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports the chosen plan length in days', () => {
    render(<PlansPage />);

    fireEvent.click(screen.getByRole('button', { name: 'continue' }));

    expect(phCapture).toHaveBeenCalledWith('plan_selected', { days: 365 });
    expect(navigate).toHaveBeenCalledWith('/profile/payments/plan-365');
  });
});
