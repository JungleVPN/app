/**
 * PricingSection's tax note — the pricing cards say prices include tax only
 * where that is guaranteed: the global storefront while Whop, whose plans
 * are tax-inclusive, takes the payment.
 */
import { render, screen } from '@testing-library/react';
import type { SubscriptionPlanDto } from '@workspace/types';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PricingSection } from './PricingSection';

const { storefront } = vi.hoisted(() => ({
  storefront: { scope: 'global' as 'global' | 'ru', provider: 'whop' as string },
}));

const PLAN: SubscriptionPlanDto = {
  planId: 'whop-30',
  days: 30,
  countryCode: null,
  isTrial: false,
  planPricing: {
    total: '6.00',
    monthly: '6.00',
    fullTotal: null,
    discountPercent: 0,
    currencyCode: 'EUR',
  },
};

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: { children: ReactNode }) => <div>{children}</div> },
}));
vi.mock('../../components', () => ({ PaymentMethodIcons: () => null }));
vi.mock('../../components/PriceCard/PriceCard', () => ({
  PriceCard: ({ price }: { price: string }) => <p>{price}</p>,
}));
vi.mock('../../ui', () => ({
  Grid: ({ children }: { children: ReactNode }) => <>{children}</>,
  GridItem: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../../hooks', () => ({ useNavigation: () => vi.fn(), usePlans: () => [PLAN] }));
vi.mock('../../runtime', () => ({ useAppRoutes: () => ({ getSubscriptionPath: () => '/' }) }));
vi.mock('../../utils', async () => {
  const { calculatePricing, mapPlans } = await import('../../utils/planPricing');
  const { cn } = await import('../../utils/classnames');
  const { pricesIncludeTax } = await import('../../utils/paymentProvider');
  return {
    calculatePricing,
    mapPlans,
    cn,
    pricesIncludeTax,
    currentScope: () => storefront.scope,
    get GLOBAL_PAYMENT_PROVIDER() {
      return storefront.provider;
    },
  };
});

const TAX_NOTE = 'landing.pricing.tax_included_note';

describe('PricingSection tax note', () => {
  beforeEach(() => {
    storefront.scope = 'global';
    storefront.provider = 'whop';
  });

  it('says prices include tax on the global storefront while Whop takes the payment', () => {
    render(<PricingSection />);

    expect(screen.getByText(TAX_NOTE)).toBeTruthy();
  });

  it.each(['paddle', 'stripe'])('makes no tax claim while %s takes the payment', (provider) => {
    storefront.provider = provider;
    render(<PricingSection />);

    expect(screen.queryByText(TAX_NOTE)).toBeNull();
  });

  it('makes no tax claim on the RU storefront', () => {
    storefront.scope = 'ru';
    render(<PricingSection />);

    expect(screen.queryByText(TAX_NOTE)).toBeNull();
  });
});
