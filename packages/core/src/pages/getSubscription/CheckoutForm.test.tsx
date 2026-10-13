/**
 * CheckoutForm's order summary — what the payer is told they will pay. A
 * provider that took a promo code hands over the discounted total, which
 * replaces the plan's own discount: the plan price is crossed out and the
 * promo's saving is the one chip shown.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PlanPricing, SubscriptionPlanDto } from '@workspace/types';
import { cloneElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CheckoutForm } from './CheckoutForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({
    i18nKey,
    components,
  }: {
    i18nKey: string;
    components?: Record<number, ReactElement>;
  }) => (
    <>
      {i18nKey}
      {components?.[1] && cloneElement(components[1], undefined, 'learn-more')}
    </>
  ),
}));
vi.mock('../../assets/Logo.svg?react', () => ({ default: () => null }));
vi.mock('../../components', () => ({
  FeaturesCard: () => null,
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
  PaymentMethodIcons: () => null,
}));
const { openTerms } = vi.hoisted(() => ({ openTerms: vi.fn() }));
vi.mock('../../stores', () => ({ useTermsStore: () => ({ open: openTerms }) }));
vi.mock('../../ui', () => ({
  Block: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  Grid: ({ children }: { children: ReactNode }) => <>{children}</>,
  GridItem: ({ children }: { children: ReactNode }) => <>{children}</>,
  Heading: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
  Paragraph: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));
vi.mock('../../utils', () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
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
      completeEmailStep={() => true}
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

describe('CheckoutForm tax note', () => {
  it('tells the payer the price includes tax when the provider guarantees it', () => {
    renderForm({ taxNote: 'getSubscription.tax_included_note' });

    expect(screen.getByText('getSubscription.tax_included_note')).toBeTruthy();
  });

  it('makes no claim about tax otherwise', () => {
    renderForm();

    expect(screen.queryByText('getSubscription.tax_included_note')).toBeNull();
  });
});

describe('CheckoutForm steps', () => {
  const next = () => fireEvent.click(screen.getByRole('button', { name: 'common.next' }));

  it('shows only the email block to a visitor at first', () => {
    renderForm({ isAuthenticated: false, paymentMethodsSlot: <p>methods</p> });

    expect(screen.getByPlaceholderText('getSubscription.email_placeholder')).toBeTruthy();
    expect(screen.queryByText('methods')).toBeNull();
    expect(screen.queryByText('getSubscription.order_title')).toBeNull();
    expect(screen.queryByRole('button', { name: 'common.back' })).toBeNull();
  });

  it('moves a visitor to the payment methods once the email is valid', async () => {
    renderForm({ isAuthenticated: false, paymentMethodsSlot: <p>methods</p> });

    next();

    expect(await screen.findByText('methods')).toBeTruthy();
    expect(screen.getByText('getSubscription.order_title')).toBeTruthy();
  });

  it('keeps a visitor on the email step while the email is invalid', async () => {
    const completeEmailStep = vi.fn(() => false);
    renderForm({ isAuthenticated: false, completeEmailStep, paymentMethodsSlot: <p>methods</p> });

    next();

    await waitFor(() => expect(completeEmailStep).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('methods')).toBeNull();
  });

  it('lets a visitor go back to the email step', async () => {
    renderForm({ isAuthenticated: false });
    next();

    fireEvent.click(await screen.findByRole('button', { name: 'common.back' }));

    expect(await screen.findByPlaceholderText('getSubscription.email_placeholder')).toBeTruthy();
  });

  it('shows a signed-in payer the payment methods first, with no email step or Back', () => {
    renderForm({ isAuthenticated: true, paymentMethodsSlot: <p>methods</p> });

    expect(screen.getByText('methods')).toBeTruthy();
    expect(screen.queryByPlaceholderText('getSubscription.email_placeholder')).toBeNull();
    expect(screen.queryByRole('button', { name: 'common.back' })).toBeNull();
  });

  it('starts the checkout from the payment step', () => {
    const handleSubmit = vi.fn();
    renderForm({ isAuthenticated: true, handleSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'getSubscription.submit' }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('explains what purchasing agrees to above the submit button, linking to the terms', () => {
    renderForm({ isAuthenticated: true });

    expect(screen.getByText('getSubscription.terms_agreement')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'learn-more' }));

    expect(openTerms).toHaveBeenCalledTimes(1);
  });
});
