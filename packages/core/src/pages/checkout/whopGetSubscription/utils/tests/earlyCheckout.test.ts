/**
 * earlyCheckout — what the wallet probe and the card form load against before
 * the backend accepts the checkout. Both start as soon as the page knows our
 * Whop account and the plan, while the payer is still giving their email;
 * once the backend accepts the checkout, its answer is the one that counts.
 */
import type { SubscriptionPlanDto } from '@workspace/types';
import { describe, expect, it } from 'vitest';
import type { WhopCheckoutState } from '../../../whopCheckout/whopCheckoutState';
import { NOT_PREPARED, type PreparedCheckout } from '../../hooks/usePreparedCheckout';
import { earlyCheckout } from '../earlyCheckout';

const plan = (overrides: Partial<SubscriptionPlanDto> = {}): SubscriptionPlanDto => ({
  planId: 'whop-30',
  checkoutPlanId: 'plan_from_plans',
  days: 30,
  countryCode: null,
  isTrial: false,
  planPricing: {
    total: '10.00',
    monthly: '10.00',
    fullTotal: '12.00',
    discountPercent: 17,
    currencyCode: 'USD',
  },
  ...overrides,
});

const CHARGE = { amount: '10.00', currency: 'USD' };

const unprepared = (): WhopCheckoutState => ({ ...NOT_PREPARED, charge: CHARGE });

const prepared = (overrides: Partial<PreparedCheckout> = {}): PreparedCheckout => ({
  accountId: 'biz_backend',
  whopPlanId: 'plan_1',
  renews: false,
  request: { email: 'payer@test.com', planId: 'whop-30' },
  selectedPeriod: 30,
  ...overrides,
});

describe('earlyCheckout', () => {
  it('loads before the checkout is accepted, against the configured account and the plan', () => {
    const early = earlyCheckout({
      checkout: unprepared(),
      prepared: null,
      plan: plan(),
      configuredAccountId: 'biz_configured',
    });

    expect(early).toMatchObject({ canProbeWallets: true, canMountCard: true });
    expect(early.checkout).toMatchObject({
      accountId: 'biz_configured',
      whopPlanId: 'plan_from_plans',
      renews: true,
      charge: CHARGE,
    });
  });

  it('loads a trial, which does not renew, without saving the card for renewals', () => {
    const early = earlyCheckout({
      checkout: unprepared(),
      prepared: null,
      plan: plan({ isTrial: true }),
      configuredAccountId: 'biz_configured',
    });

    expect(early.checkout.renews).toBe(false);
  });

  it('probes wallets but waits for the backend to mount the card when the plan names no Whop plan', () => {
    const { checkoutPlanId: _, ...withoutWhopPlan } = plan();

    const early = earlyCheckout({
      checkout: unprepared(),
      prepared: null,
      plan: withoutWhopPlan,
      configuredAccountId: 'biz_configured',
    });

    expect(early).toMatchObject({ canProbeWallets: true, canMountCard: false });
  });

  it('waits for the backend when the page does not know the account', () => {
    const early = earlyCheckout({
      checkout: unprepared(),
      prepared: null,
      plan: plan(),
      configuredAccountId: null,
    });

    expect(early).toMatchObject({ canProbeWallets: false, canMountCard: false });
  });

  it('waits while there is no plan to price', () => {
    const early = earlyCheckout({
      checkout: unprepared(),
      prepared: null,
      plan: undefined,
      configuredAccountId: 'biz_configured',
    });

    expect(early).toMatchObject({ canProbeWallets: false, canMountCard: false });
  });

  it('loads the accepted checkout as the backend named it, once there is one', () => {
    const accepted = { ...prepared({ renews: false }), charge: CHARGE };

    const early = earlyCheckout({
      checkout: accepted,
      prepared: prepared({ renews: false }),
      plan: plan({ isTrial: false }),
      configuredAccountId: 'biz_configured',
    });

    expect(early).toEqual({ checkout: accepted, canProbeWallets: true, canMountCard: true });
  });
});
