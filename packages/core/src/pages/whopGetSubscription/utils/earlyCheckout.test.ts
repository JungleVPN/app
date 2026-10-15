/**
 * walletProbe — what the wallet probe runs against. Wallets are probed as
 * soon as the page knows our Whop account and the plan, while the payer is
 * still giving their email; once the backend accepts the checkout, its
 * answer is the one that counts.
 */
import type { SubscriptionPlanDto } from '@workspace/types';
import { describe, expect, it } from 'vitest';
import type { WhopCheckoutState } from '../../whopCheckout/whopCheckoutState';
import { NOT_PREPARED, type PreparedCheckout } from '../hooks/usePreparedCheckout';
import { walletProbe } from './walletProbe';

const plan = (overrides: Partial<SubscriptionPlanDto> = {}): SubscriptionPlanDto => ({
  planId: 'whop-30',
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

describe('walletProbe', () => {
  it('probes before the checkout is accepted, against the configured account and the plan', () => {
    const probe = walletProbe({
      checkout: unprepared(),
      prepared: null,
      plan: plan(),
      configuredAccountId: 'biz_configured',
    });

    expect(probe.enabled).toBe(true);
    expect(probe.checkout).toMatchObject({
      accountId: 'biz_configured',
      renews: true,
      charge: CHARGE,
    });
  });

  it('probes a trial, which does not renew, without saving the card for renewals', () => {
    const probe = walletProbe({
      checkout: unprepared(),
      prepared: null,
      plan: plan({ isTrial: true }),
      configuredAccountId: 'biz_configured',
    });

    expect(probe.checkout.renews).toBe(false);
  });

  it('waits for the backend when the page does not know the account', () => {
    const probe = walletProbe({
      checkout: unprepared(),
      prepared: null,
      plan: plan(),
      configuredAccountId: null,
    });

    expect(probe.enabled).toBe(false);
  });

  it('waits while there is no plan to price', () => {
    const probe = walletProbe({
      checkout: unprepared(),
      prepared: null,
      plan: undefined,
      configuredAccountId: 'biz_configured',
    });

    expect(probe.enabled).toBe(false);
  });

  it('probes the accepted checkout as the backend named it, once there is one', () => {
    const accepted = { ...prepared({ renews: false }), charge: CHARGE };

    const probe = walletProbe({
      checkout: accepted,
      prepared: prepared({ renews: false }),
      plan: plan({ isTrial: false }),
      configuredAccountId: 'biz_configured',
    });

    expect(probe).toEqual({ checkout: accepted, enabled: true });
  });
});
