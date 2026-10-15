/**
 * CheckoutForm's order summary — what the payer is told they will pay. A
 * provider that took a promo code hands over the discounted total, which
 * replaces the plan's own discount: the plan price is crossed out and the
 * promo's saving is the one chip shown.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PlanPricing, SubscriptionPlanDto } from '@workspace/types';
import { cloneElement, type ReactElement, type ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCheckoutEmail, saveCheckoutEmail } from '../../../utils/checkoutEmail';
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
vi.mock('../../../assets/Logo.svg?react', () => ({ default: () => null }));
vi.mock('../../../components', async () => ({
  ...(await import('../../../components/Stepper')),
  FeaturesCard: () => null,
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
  PaymentMethodIcons: () => null,
}));
const { openTerms } = vi.hoisted(() => ({ openTerms: vi.fn() }));
vi.mock('../../../stores', () => ({ useTermsStore: () => ({ open: openTerms }) }));
vi.mock('../../../ui', () => ({
  Block: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  Grid: ({ children }: { children: ReactNode }) => <>{children}</>,
  GridItem: ({ children }: { children: ReactNode }) => <>{children}</>,
  Heading: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
  Paragraph: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));
vi.mock('../../../utils', () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
  formatPlanPrice: (_pricing: PlanPricing, amount: string) => `$${amount}`,
  scrollToTop: () => {},
  trackEmailStepSubmitted: () => {},
  trackEmailStepViewed: () => {},
}));
vi.mock('../../../utils/planPricing', () => ({ formatPeriod: () => '1 month' }));
vi.mock('../../profile/payment/components/TermsDialog', () => ({ TermsDialog: () => null }));

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

function CurrentUrl() {
  const { pathname, search } = useLocation();
  return <p data-testid='url'>{`${pathname}${search}`}</p>;
}

const renderForm = (
  props: Partial<Parameters<typeof CheckoutForm>[0]> = {},
  url = '/payment/whop-30',
) =>
  render(
    <MemoryRouter initialEntries={[url]}>
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
      />
      <CurrentUrl />
    </MemoryRouter>,
  );

afterEach(() => localStorage.clear());

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

  it('leaves the purchase agreement out when the method already carries its own terms', () => {
    renderForm({ isAuthenticated: true, hideAgreement: true });

    expect(screen.queryByText('getSubscription.terms_agreement')).toBeNull();
    expect(screen.getByRole('button', { name: 'getSubscription.submit' })).toBeTruthy();
  });
});

describe('CheckoutForm step URLs', () => {
  const url = () => screen.getByTestId('url').textContent;
  const next = () => fireEvent.click(screen.getByRole('button', { name: 'common.next' }));

  it('moves to its own URL for the payment step when Next passes', async () => {
    renderForm({ isAuthenticated: false, email: 'payer@test.com' });

    next();

    await waitFor(() => expect(url()).toBe('/payment/whop-30?step=payment'));
  });

  it('stays on the email URL while Next fails', async () => {
    const completeEmailStep = vi.fn(() => false);
    renderForm({ isAuthenticated: false, completeEmailStep });

    next();

    await waitFor(() => expect(completeEmailStep).toHaveBeenCalled());
    expect(url()).toBe('/payment/whop-30');
  });

  it('saves the submitted email when Next passes', async () => {
    renderForm({ isAuthenticated: false, email: 'payer@test.com' });

    next();

    await waitFor(() => expect(getCheckoutEmail()).toBe('payer@test.com'));
  });

  it('replaces a stored email when a different one is submitted', async () => {
    saveCheckoutEmail('old@test.com');
    renderForm({ isAuthenticated: false, email: 'new@test.com' });

    next();

    await waitFor(() => expect(getCheckoutEmail()).toBe('new@test.com'));
  });

  it('keeps the stored email when Next fails', async () => {
    saveCheckoutEmail('old@test.com');
    const completeEmailStep = vi.fn(() => false);
    renderForm({ isAuthenticated: false, email: 'new@test.com', completeEmailStep });

    next();

    await waitFor(() => expect(completeEmailStep).toHaveBeenCalled());
    expect(getCheckoutEmail()).toBe('old@test.com');
  });

  it('shows the payment step when it is reloaded with the email stored', async () => {
    saveCheckoutEmail('payer@test.com');
    const completeEmailStep = vi.fn(() => true);
    renderForm(
      {
        isAuthenticated: false,
        email: 'payer@test.com',
        completeEmailStep,
        paymentMethodsSlot: <p>methods</p>,
      },
      '/payment/whop-30?step=payment',
    );

    expect(await screen.findByText('methods')).toBeTruthy();
    await waitFor(() => expect(completeEmailStep).toHaveBeenCalledTimes(1));
    expect(url()).toBe('/payment/whop-30?step=payment');
  });

  it('sends a reload of the payment step back to the email step when it is no longer accepted', async () => {
    saveCheckoutEmail('payer@test.com');
    renderForm(
      { isAuthenticated: false, email: 'payer@test.com', completeEmailStep: () => false },
      '/payment/whop-30?step=payment',
    );

    await waitFor(() => expect(url()).toBe('/payment/whop-30'));
  });

  it('sends a reload of the payment step back to the email step when no email is stored', async () => {
    renderForm({ isAuthenticated: false, email: '' }, '/payment/whop-30?step=payment');

    await waitFor(() => expect(url()).toBe('/payment/whop-30'));
  });

  it('does not accept the email twice when the payer moved to the payment step with Next', async () => {
    const completeEmailStep = vi.fn(() => true);
    renderForm({ isAuthenticated: false, email: 'payer@test.com', completeEmailStep });

    next();

    await waitFor(() => expect(url()).toBe('/payment/whop-30?step=payment'));
    expect(completeEmailStep).toHaveBeenCalledTimes(1);
  });

  it('ignores the step URL for a signed-in payer', () => {
    renderForm({ isAuthenticated: true }, '/payment/whop-30?step=payment');

    expect(screen.queryByRole('button', { name: 'common.next' })).toBeNull();
  });
});

describe('CheckoutForm stepper steps', () => {
  const url = () => screen.getByTestId('url').textContent;
  const step = (title: string) =>
    fireEvent.click(screen.getByRole('button', { name: new RegExp(title) }));

  it('moves to the payment step when its number is pressed and the email is valid', async () => {
    renderForm({ isAuthenticated: false, email: 'payer@test.com' });

    step('step_payment_title');

    await waitFor(() => expect(url()).toBe('/payment/whop-30?step=payment'));
    expect(getCheckoutEmail()).toBe('payer@test.com');
  });

  it('stays on the email step when the payment step is pressed with an invalid email', async () => {
    const completeEmailStep = vi.fn(() => false);
    renderForm({ isAuthenticated: false, completeEmailStep });

    step('step_payment_title');

    await waitFor(() => expect(completeEmailStep).toHaveBeenCalledTimes(1));
    expect(url()).toBe('/payment/whop-30');
  });

  it('goes back to the email step when its number is pressed', async () => {
    renderForm({ isAuthenticated: false }, '/payment/whop-30?step=payment');

    step('step_email_title');

    await waitFor(() => expect(url()).toBe('/payment/whop-30'));
  });

  it('does nothing when the step already shown is pressed', async () => {
    const completeEmailStep = vi.fn(() => true);
    renderForm({ isAuthenticated: false, completeEmailStep });
    step('step_payment_title');
    await waitFor(() => expect(url()).toBe('/payment/whop-30?step=payment'));
    completeEmailStep.mockClear();

    step('step_payment_title');

    await Promise.resolve();
    expect(completeEmailStep).not.toHaveBeenCalled();
  });
});

describe('CheckoutForm email step loader', () => {
  const nextButton = () => screen.getByRole('button', { name: /common.next/ });

  it('shows a spinner on Next while the email is being checked', async () => {
    let finish: (isAccepted: boolean) => void = () => {};
    const completeEmailStep = vi.fn(() => new Promise<boolean>((resolve) => (finish = resolve)));
    renderForm({ isAuthenticated: false, completeEmailStep });
    expect(nextButton().querySelector('.spinner')).toBeNull();

    fireEvent.click(nextButton());

    await waitFor(() => expect(nextButton().querySelector('.spinner')).not.toBeNull());
    finish(false);
    await waitFor(() => expect(nextButton().querySelector('.spinner')).toBeNull());
  });
});

describe('CheckoutForm email field', () => {
  it('has an accessible name, since it shows no visible label', () => {
    renderForm({ isAuthenticated: false });

    expect(screen.getByRole('textbox', { name: 'getSubscription.email_label' })).toBeTruthy();
  });
});
