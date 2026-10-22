/**
 * PublicPlansPage — picking a plan on the public /plans page and moving on to
 * its checkout. Plan lengths are in days.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import type { SubscriptionPlanDto } from '@workspace/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicPlansPage } from '../PlansPage';

const { phCapture, navigate, warmWhopCheckout } = vi.hoisted(() => ({
  phCapture: vi.fn(),
  navigate: vi.fn(),
  warmWhopCheckout: vi.fn(),
}));

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

vi.mock('../../../../hooks', () => ({
  useNavigation: () => navigate,
  usePlans: () => [plan(30), plan(90), plan(365)],
}));
vi.mock('../../../../runtime', () => ({
  useAppRoutes: () => ({ getSubscriptionPath: (planId: string) => `/payment/${planId}` }),
}));
vi.mock('../../../../ui', () => ({ Container: ({ children }: { children: unknown }) => children }));
vi.mock('../../../../utils', async () => {
  const { mapPlans } = await import('../../../../utils/payment/planPricing');
  return { mapPlans, phCapture, currentScope: () => 'global' };
});
vi.mock('../../../checkout/whopCheckout/utils/whopWarmUp', () => ({ warmWhopCheckout }));
vi.mock('../../../profile/plans/PlansComponent', () => ({
  PlansComponent: ({ onSubmit }: { onSubmit: () => void }) => (
    <button type='button' onClick={onSubmit}>
      continue
    </button>
  ),
}));

describe('PublicPlansPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preselects the yearly plan and reports its length in days', () => {
    render(<PublicPlansPage />);

    fireEvent.click(screen.getByRole('button', { name: 'continue' }));

    expect(phCapture).toHaveBeenCalledWith('plan_selected', { days: 365 });
    expect(navigate).toHaveBeenCalledWith('/payment/plan-365');
  });
});

describe('PublicPlansPage warming the checkout', () => {
  it('starts loading the checkout while the visitor picks a plan', () => {
    render(<PublicPlansPage />);

    expect(warmWhopCheckout).toHaveBeenCalledWith('global');
  });
});
