/**
 * CheckoutForm's order summary — what the payer is told they will pay. A
 * provider that took a promo code hands over the discounted total, which
 * replaces the plan's own discount: the plan price is crossed out and the
 * promo's saving is the one chip shown.
 */
import { render, screen } from '@testing-library/react';
import type { PlanPricing, SubscriptionPlanDto } from '@workspace/types';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CheckoutForm } from './CheckoutForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));
vi.mock('../../assets/Logo.svg?react', () => ({ default: () => null }));
vi.mock('../../components', () => ({
  FeaturesCard: () => null,
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
  PaymentMethodIcons: () => null,
}));
vi.mock('../../stores', () => ({ useTermsStore: () => ({ open: () => {} }) }));
vi.mock('../../ui', () => ({
  Block: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  Container: ({ children }: { children: ReactNode }) => <>{children}</>,
  Grid: ({ children }: { children: ReactNode }) => <>{children}</>,
  GridItem: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../../ui/Heading', () => ({
  Heading: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
}));
vi.mock('../../ui/Paragraph', () => ({
  Paragraph: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));
vi.mock('../../utils', () => ({
  formatPlanPrice: (_pricing: PlanPricing, amount: string) => `$${amount}`,
  scrollToTop: () => {},
}));
vi.mock('../../utils/planPricing', () => ({ formatPeriod: () => '1 month' }));
vi.mock('../profile/payment/components/TermsDialog', () => ({ TermsDialog: () => null }));

const plan = (pricing: Partial<PlanPricing> = {}): SubscriptionPlanDto => ({
  planId: 'whop-30',
  days: 30,
  countryCode: null,
  isTrial: false,
  planPricing: {
    total: '50.00',
    monthly: '50.00',
    fullTotal: '60.00',
    discountPercent: 17,
    currencyCode: 'USD',
    ...pricing,
  },
});

const renderForm = (props: Partial<Parameters<typeof CheckoutForm>[0]> = {}) =>
  render(
    <CheckoutForm
      isAuthenticated
      email='payer@test.com'
      emailError=''
      checkoutError={null}
      isPending={false}
      selectedPeriod={30}
      plan={plan()}
      canSubmit
      handleSubmit={() => {}}
      handleEmailChange={() => {}}
      {...props}
    />,
  );

const isCrossedOut = (text: string) => screen.getByText(text).className.includes('line-through');

describe('CheckoutForm order summary', () => {
  it("shows the plan's own discount when no promo code applies", () => {
    renderForm();

    expect(isCrossedOut('$60.00')).toBe(true);
    expect(isCrossedOut('$50.00')).toBe(false);
    expect(screen.getByText('getSubscription.discount')).toBeTruthy();
  });

  it("replaces the plan's discount with the promo's, crossing out the plan price", () => {
    renderForm({ promoDiscount: { total: '40.00', label: 'getSubscription.promo_discount' } });

    expect(isCrossedOut('$50.00')).toBe(true);
    expect(isCrossedOut('$40.00')).toBe(false);
    expect(screen.getByText('getSubscription.promo_discount')).toBeTruthy();
    expect(screen.queryByText('$60.00')).toBeNull();
    expect(screen.queryByText('getSubscription.discount')).toBeNull();
  });

  it('crosses out the plan price for a plan with no discount of its own', () => {
    renderForm({
      plan: plan({ fullTotal: null, discountPercent: 0 }),
      promoDiscount: { total: '40.00', label: 'getSubscription.promo_discount' },
    });

    expect(isCrossedOut('$50.00')).toBe(true);
    expect(screen.getByText('$40.00')).toBeTruthy();
  });

  it('keeps the total and names the saving when the discount cannot be priced', () => {
    renderForm({ promoDiscount: { label: 'getSubscription.promo_discount_amount' } });

    expect(isCrossedOut('$50.00')).toBe(false);
    expect(screen.getByText('getSubscription.promo_discount_amount')).toBeTruthy();
    expect(screen.queryByText('getSubscription.discount')).toBeNull();
    expect(screen.queryByText('$60.00')).toBeNull();
  });
});
