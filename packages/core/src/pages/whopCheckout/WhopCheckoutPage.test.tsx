/**
 * WhopCheckoutPage — the one place a Whop payment is taken, from the public
 * pricing page and from the profile alike. Whop's hosted fields hold the card
 * number; every label, button and message around them is ours, so it follows
 * the app's language rather than Whop's.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ACTIVE_SUBSCRIPTION_CODE, PROMO_CODE_INVALID_CODE } from '@workspace/types';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../api';
import WhopCheckoutPage from './WhopCheckoutPage';

const {
  navigate,
  location,
  elementsProps,
  paymentsProps,
  checkoutProps,
  expressProps,
  cardFields,
  payments,
  whop,
  api,
} = vi.hoisted(() => ({
  navigate: vi.fn(),
  location: { state: null as unknown },
  elementsProps: vi.fn(),
  paymentsProps: vi.fn(),
  checkoutProps: vi.fn(),
  expressProps: vi.fn(),
  cardFields: { onChange: (_payload: { complete: boolean }) => {} },
  payments: { createConfirmationToken: vi.fn() },
  whop: { payments: { handleNextAction: vi.fn() } },
  api: { payPublicWhopCheckout: vi.fn() },
}));

vi.mock('@whop/elements', () => ({
  loadWhop: () => 'whop-loader',
  WHOP_ELEMENTS_LOCALES: Object.assign(['en', 'es'], {
    includes: (value: string) => ['en', 'es'].includes(value),
  }),
}));
vi.mock('@whop/elements-react', () => ({
  WhopElements: ({ children, ...props }: { children: ReactNode }) => {
    elementsProps(props);
    return <div data-testid='whop-elements'>{children}</div>;
  },
  Payments: ({ children, ...props }: { children: ReactNode }) => {
    paymentsProps(props);
    return <>{children}</>;
  },
  Checkout: ({ children, ...props }: { children: ReactNode }) => {
    checkoutProps(props);
    return <>{children}</>;
  },
  ExpressCheckoutElement: (props: object) => {
    expressProps(props);
    return <div data-testid='express-checkout' />;
  },
  CardFields: ({
    children,
    onChange,
  }: {
    children: ReactNode;
    onChange: (payload: { complete: boolean }) => void;
  }) => {
    cardFields.onChange = onChange;
    return <>{children}</>;
  },
  CardNumberElement: () => <div data-testid='card-number' />,
  CardExpiryElement: () => <div data-testid='card-expiry' />,
  CardCvcElement: () => <div data-testid='card-cvc' />,
  BrandingElement: () => <div data-testid='whop-branding' />,
  usePayments: () => payments,
  useWhop: () => whop,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router', () => ({ useLocation: () => location }));
vi.mock('../../core/i18n', () => ({ i18n: { language: 'es' } }));
vi.mock('../../hooks', () => ({ useBackButton: () => {}, useNavigation: () => navigate }));
vi.mock('../../runtime', () => ({
  useAppRoutes: () => ({ paymentReturnPath: '/payment/success' }),
  usePaymentsApi: () => api,
}));
vi.mock('../../stores', () => ({
  useNavbarStore: () => ({ setNavbarVisible: () => {} }),
  useTermsStore: () => ({ open: () => {} }),
}));
vi.mock('../../ui', () => ({
  Container: ({ children }: { children: ReactNode }) => <>{children}</>,
  Page: ({ children }: { children: ReactNode }) => <>{children}</>,
  Block: ({ children, title }: { children: ReactNode; title?: string }) => (
    <section>
      {title && <h3>{title}</h3>}
      {children}
    </section>
  ),
  Paragraph: ({ children, ...props }: { children: ReactNode }) => <p {...props}>{children}</p>,
}));
vi.mock('../../utils', () => ({ PRICING_PATH: '/pricing' }));

const RETURN_URL = `${window.location.origin}/payment/success`;
const REQUEST = { email: 'payer@test.com', planId: 'whop-30', toltReferralId: null, inviterId: 7 };

const payButton = () => screen.getByRole('button', { name: 'whopCheckout.pay' });

/** Everything the payer does before pressing pay: a complete card, their name and postal code. */
const fillCard = () => {
  cardFields.onChange({ complete: true });
  fireEvent.change(screen.getByLabelText('whopCheckout.name'), {
    target: { value: 'Ada Lovelace' },
  });
  fireEvent.change(screen.getByLabelText('whopCheckout.postal_code'), {
    target: { value: '28001' },
  });
};

const renderFilledAndPay = async () => {
  render(<WhopCheckoutPage />);
  await screen.findByTestId('card-number');
  fillCard();
  await waitFor(() => expect(payButton().hasAttribute('disabled')).toBe(false));
  fireEvent.click(payButton());
};

describe('WhopCheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('PUBLIC_WHOP_ENVIRONMENT', 'sandbox');
    location.state = {
      accountId: 'biz_1',
      whopPlanId: 'plan_1',
      request: REQUEST,
      selectedPeriod: 30,
    };
    payments.createConfirmationToken.mockResolvedValue({
      confirmationToken: 'ctok_1',
      type: 'card',
    });
    api.payPublicWhopCheckout.mockResolvedValue({
      paymentId: 'pay_1',
      status: 'paid',
      clientSecret: 'sec_1',
    });
  });

  describe('mounting', () => {
    it('mounts the card form for the account and Whop plan the backend validated', async () => {
      render(<WhopCheckoutPage />);

      await screen.findByTestId('card-number');
      expect(paymentsProps).toHaveBeenLastCalledWith(
        expect.objectContaining({ accountId: 'biz_1', plan: 'plan_1', returnUrl: RETURN_URL }),
      );
    });

    it("talks to the configured Whop environment, in the visitor's language", async () => {
      render(<WhopCheckoutPage />);

      await screen.findByTestId('card-number');
      expect(elementsProps).toHaveBeenLastCalledWith(
        expect.objectContaining({ elements: 'whop-loader', environment: 'sandbox', locale: 'es' }),
      );
    });

    it('labels every card field with our own translations', async () => {
      render(<WhopCheckoutPage />);

      await screen.findByTestId('card-number');
      for (const key of [
        'whopCheckout.card_title',
        'whopCheckout.card_number',
        'whopCheckout.expiry',
        'whopCheckout.cvc',
      ]) {
        expect(screen.getByText(key)).toBeTruthy();
      }
      expect(screen.getByTestId('card-number')).toBeTruthy();
      expect(screen.getByTestId('card-expiry')).toBeTruthy();
      expect(screen.getByTestId('card-cvc')).toBeTruthy();
    });

    it("shows Whop's merchant-of-record notice, without which Whop refuses the payment", async () => {
      render(<WhopCheckoutPage />);

      expect(await screen.findByTestId('whop-branding')).toBeTruthy();
    });

    it('sends a visitor with no checkout back to pick a plan', () => {
      location.state = null;

      render(<WhopCheckoutPage />);

      expect(navigate).toHaveBeenCalledWith('/pricing', { replace: true });
      expect(screen.queryAllByTestId('whop-elements')).toHaveLength(0);
    });

    it('falls back to the path it was given, such as the profile plans page', () => {
      location.state = null;

      render(<WhopCheckoutPage fallbackPath='/profile/plans' />);

      expect(navigate).toHaveBeenCalledWith('/profile/plans', { replace: true });
    });
  });

  describe('wallets', () => {
    const lastCheckout = () => checkoutProps.mock.lastCall?.[0];

    it('offers Apple Pay and Google Pay for the Whop plan the backend validated', async () => {
      render(<WhopCheckoutPage />);

      await screen.findByTestId('express-checkout');
      expect(checkoutProps).toHaveBeenLastCalledWith(
        expect.objectContaining({ plan: 'plan_1', returnUrl: RETURN_URL }),
      );
      expect(expressProps).toHaveBeenLastCalledWith(
        expect.objectContaining({ layout: 'auto', wallets: ['apple_pay', 'google_pay'] }),
      );
    });

    it('stamps the payment with what the webhook identifies the payer by, as the card charge does', async () => {
      render(<WhopCheckoutPage />);

      await screen.findByTestId('express-checkout');
      expect(lastCheckout().metadata).toEqual({
        email: 'payer@test.com',
        inviterId: '7',
        signupOrigin: window.location.origin,
      });
    });

    it('carries the Tolt referral when the visitor arrived through one', async () => {
      location.state = {
        accountId: 'biz_1',
        whopPlanId: 'plan_1',
        request: { email: 'payer@test.com', planId: 'whop-30', toltReferralId: 'tolt_1' },
        selectedPeriod: 30,
      };
      render(<WhopCheckoutPage />);

      await screen.findByTestId('express-checkout');
      expect(lastCheckout().metadata).toEqual({
        email: 'payer@test.com',
        toltReferralId: 'tolt_1',
        signupOrigin: window.location.origin,
      });
    });

    it('keeps the same metadata across re-renders, since Whop refuses a changed checkout', async () => {
      const { rerender } = render(<WhopCheckoutPage />);
      await screen.findByTestId('express-checkout');
      rerender(<WhopCheckoutPage />);

      const [first, last] = [checkoutProps.mock.calls[0][0], lastCheckout()];
      expect(checkoutProps.mock.calls.length).toBeGreaterThan(1);
      expect(last.metadata).toBe(first.metadata);
    });

    it('goes to the success page once the wallet payment completes', async () => {
      render(<WhopCheckoutPage />);

      await screen.findByTestId('express-checkout');
      lastCheckout().onComplete({ result: 'payment', paymentId: 'pay_1', sessionId: 'ses_1' });

      expect(navigate).toHaveBeenCalledWith('/payment/success', { replace: true });
    });
  });

  describe('promo code', () => {
    const SPRING20 = { code: 'SPRING20', promoType: 'percentage', amountOff: 20, currency: 'usd' };
    const seedPromo = () => {
      location.state = { ...(location.state as object), promo: SPRING20 };
    };
    const invalidPromo = () =>
      new ApiClientError({
        status: 400,
        message: 'Bad Request',
        data: { code: PROMO_CODE_INVALID_CODE },
      });

    it('offers no promo code field, since the code is settled before the checkout opens', async () => {
      render(<WhopCheckoutPage />);
      await screen.findByTestId('card-number');

      expect(screen.queryByLabelText('whopCheckout.promo_code')).toBeNull();
    });

    it('opens the wallet checkout with the code the payer applied before starting', async () => {
      seedPromo();
      render(<WhopCheckoutPage />);
      await screen.findByTestId('express-checkout');

      expect(checkoutProps).toHaveBeenLastCalledWith(
        expect.objectContaining({ promoCode: 'SPRING20' }),
      );
    });

    it('opens the wallet checkout at full price when no code was applied', async () => {
      render(<WhopCheckoutPage />);
      await screen.findByTestId('express-checkout');

      expect(checkoutProps.mock.lastCall?.[0].promoCode).toBeUndefined();
    });

    it('charges the card with the code the payer applied before starting', async () => {
      seedPromo();

      await renderFilledAndPay();

      await waitFor(() =>
        expect(api.payPublicWhopCheckout).toHaveBeenCalledWith(
          expect.objectContaining({ promoCode: 'SPRING20' }),
        ),
      );
    });

    it('charges the card at full price when no code was applied', async () => {
      await renderFilledAndPay();

      await waitFor(() => expect(api.payPublicWhopCheckout).toHaveBeenCalled());
      expect(api.payPublicWhopCheckout.mock.lastCall?.[0]).not.toHaveProperty('promoCode');
    });

    it('explains a code that stopped applying by the time the card is charged', async () => {
      seedPromo();
      api.payPublicWhopCheckout.mockRejectedValue(invalidPromo());

      await renderFilledAndPay();

      expect((await screen.findByRole('alert')).textContent).toBe(
        'whopCheckout.errors.promo_invalid',
      );
    });
  });

  describe('pay button', () => {
    it('stays disabled until the card is complete', async () => {
      render(<WhopCheckoutPage />);
      await screen.findByTestId('card-number');

      fireEvent.change(screen.getByLabelText('whopCheckout.name'), {
        target: { value: 'Ada Lovelace' },
      });
      fireEvent.change(screen.getByLabelText('whopCheckout.postal_code'), {
        target: { value: '28001' },
      });

      expect(payButton().hasAttribute('disabled')).toBe(true);
    });

    it.each([
      ['name on card', 'whopCheckout.name'],
      ['postal code', 'whopCheckout.postal_code'],
    ])('stays disabled without the %s', async (_case, label) => {
      render(<WhopCheckoutPage />);
      await screen.findByTestId('card-number');

      fillCard();
      fireEvent.change(screen.getByLabelText(label), { target: { value: '  ' } });

      expect(payButton().hasAttribute('disabled')).toBe(true);
    });
  });

  describe('country', () => {
    const countryInput = () => screen.getByRole('combobox', { name: /whopCheckout\.country/ });

    it("preselects the country the visitor's language points to", async () => {
      render(<WhopCheckoutPage />);
      await screen.findByTestId('card-number');

      expect((countryInput() as HTMLInputElement).value).toBe('España');
    });

    it('lets the payer search for their country by typing part of its name', async () => {
      render(<WhopCheckoutPage />);
      await screen.findByTestId('card-number');
      fillCard();

      countryInput().focus();
      fireEvent.change(countryInput(), { target: { value: 'alema' } });
      const matches = await screen.findAllByRole('option');
      expect(matches.map((option) => option.textContent)).toEqual(['Alemania']);

      fireEvent.click(matches[0]);
      await waitFor(() => expect(payButton().hasAttribute('disabled')).toBe(false));
      fireEvent.click(payButton());

      await waitFor(() =>
        expect(payments.createConfirmationToken).toHaveBeenCalledWith({
          billingDetails: expect.objectContaining({
            address: { country: 'DE', postal_code: '28001' },
          }),
        }),
      );
    });

    it('takes the country the browser autofills along with the postal code', async () => {
      const { container } = render(<WhopCheckoutPage />);
      await screen.findByTestId('card-number');
      fillCard();

      const autofill = container.querySelector('select[autocomplete="country"]');
      if (!autofill) throw new Error('no autofillable country field');
      fireEvent.change(autofill, { target: { value: 'PT' } });

      await waitFor(() => expect((countryInput() as HTMLInputElement).value).toBe('Portugal'));
      fireEvent.click(payButton());
      await waitFor(() =>
        expect(payments.createConfirmationToken).toHaveBeenCalledWith({
          billingDetails: expect.objectContaining({
            address: { country: 'PT', postal_code: '28001' },
          }),
        }),
      );
    });

    it('keeps the autofillable country in step with the one the payer picked', async () => {
      const { container } = render(<WhopCheckoutPage />);
      await screen.findByTestId('card-number');

      const autofill = container.querySelector<HTMLSelectElement>('select[autocomplete="country"]');

      expect(autofill?.value).toBe('ES');
      expect(autofill?.getAttribute('aria-hidden')).toBe('true');
      expect(autofill?.tabIndex).toBe(-1);
    });

    it('blocks paying once the payer clears the country', async () => {
      render(<WhopCheckoutPage />);
      await screen.findByTestId('card-number');
      fillCard();

      fireEvent.change(countryInput(), { target: { value: '' } });

      await waitFor(() => expect(payButton().hasAttribute('disabled')).toBe(true));
    });
  });

  describe('paying', () => {
    it('tokenises the card with the billing details Whop needs for a card', async () => {
      await renderFilledAndPay();

      await waitFor(() =>
        expect(payments.createConfirmationToken).toHaveBeenCalledWith({
          billingDetails: {
            email: 'payer@test.com',
            name: 'Ada Lovelace',
            address: { country: 'ES', postal_code: '28001' },
          },
        }),
      );
    });

    it('charges the token for the validated checkout, returning to the success page', async () => {
      await renderFilledAndPay();

      await waitFor(() =>
        expect(api.payPublicWhopCheckout).toHaveBeenCalledWith({
          ...REQUEST,
          confirmationToken: 'ctok_1',
          returnUrl: RETURN_URL,
        }),
      );
    });

    it('goes straight to the success page when the charge is already paid', async () => {
      await renderFilledAndPay();

      await waitFor(() =>
        expect(navigate).toHaveBeenCalledWith('/payment/success', { replace: true }),
      );
      expect(whop.payments.handleNextAction).not.toHaveBeenCalled();
    });

    it.each([
      ['succeeded'],
      ['processing'],
    ])('finishes a pending step such as 3DS, then shows success once it is %s', async (status) => {
      api.payPublicWhopCheckout.mockResolvedValue({
        paymentId: 'pay_1',
        status: 'open',
        clientSecret: 'sec_1',
      });
      whop.payments.handleNextAction.mockResolvedValue({
        status,
        redirected: false,
        lastPaymentError: null,
      });

      await renderFilledAndPay();

      await waitFor(() =>
        expect(navigate).toHaveBeenCalledWith('/payment/success', { replace: true }),
      );
      expect(whop.payments.handleNextAction).toHaveBeenCalledWith({ clientSecret: 'sec_1' });
    });

    it('leaves the page to Whop when the pending step redirects off-site', async () => {
      api.payPublicWhopCheckout.mockResolvedValue({
        paymentId: 'pay_1',
        status: 'open',
        clientSecret: 'sec_1',
      });
      whop.payments.handleNextAction.mockResolvedValue({
        status: 'requires_action',
        redirected: true,
        lastPaymentError: null,
      });

      await renderFilledAndPay();

      await waitFor(() => expect(whop.payments.handleNextAction).toHaveBeenCalled());
      expect(navigate).not.toHaveBeenCalled();
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  describe('failures, in our own words', () => {
    const pendingPayment = () =>
      api.payPublicWhopCheckout.mockResolvedValue({
        paymentId: 'pay_1',
        status: 'open',
        clientSecret: 'sec_1',
      });

    it('reports a decline without echoing Whop’s English message', async () => {
      pendingPayment();
      whop.payments.handleNextAction.mockResolvedValue({
        status: 'failed',
        redirected: false,
        lastPaymentError: { code: 'card_declined', message: 'Your card was declined.' },
      });

      await renderFilledAndPay();

      expect((await screen.findByRole('alert')).textContent).toBe('whopCheckout.errors.declined');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('asks the payer to try again when they dismiss the verification step', async () => {
      pendingPayment();
      whop.payments.handleNextAction.mockResolvedValue({
        status: 'requires_action',
        redirected: false,
        lastPaymentError: null,
      });

      await renderFilledAndPay();

      expect((await screen.findByRole('alert')).textContent).toBe(
        'whopCheckout.errors.not_completed',
      );
    });

    it('points at the card when Whop cannot tokenise it, without charging', async () => {
      payments.createConfirmationToken.mockRejectedValue(new Error('invalid number'));

      await renderFilledAndPay();

      expect((await screen.findByRole('alert')).textContent).toBe(
        'whopCheckout.errors.card_invalid',
      );
      expect(api.payPublicWhopCheckout).not.toHaveBeenCalled();
    });

    it('explains a refusal from our backend, such as an email that already subscribes', async () => {
      api.payPublicWhopCheckout.mockRejectedValue(
        new ApiClientError({
          status: 409,
          message: 'Conflict',
          data: { code: ACTIVE_SUBSCRIPTION_CODE },
        }),
      );

      await renderFilledAndPay();

      expect((await screen.findByRole('alert')).textContent).toBe(
        'getSubscription.active_subscription_error',
      );
    });
  });
});
