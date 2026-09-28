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
  cardFields,
  payments,
  walletSheet,
  whop,
  api,
  loadScript,
} = vi.hoisted(() => {
  const walletSheet = { canMakePayment: vi.fn(), show: vi.fn() };
  return {
    navigate: vi.fn(),
    location: { state: null as unknown },
    elementsProps: vi.fn(),
    paymentsProps: vi.fn(),
    cardFields: { onChange: (_payload: { complete: boolean }) => {} },
    payments: { createConfirmationToken: vi.fn() },
    walletSheet,
    whop: {
      payments: {
        handleNextAction: vi.fn(),
        paymentRequest: { create: vi.fn(() => walletSheet) },
      },
    },
    api: { payPublicWhopCheckout: vi.fn() },
    loadScript: vi.fn(),
  };
});

vi.mock('./loadScript', () => ({ loadScript }));

/** Like Apple's own element: it keeps a click from bubbling past itself, out of React's reach. */
customElements.define(
  'apple-pay-button',
  class extends HTMLElement {
    connectedCallback() {
      this.addEventListener('click', (event) => event.stopPropagation());
    }
  },
);

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
      charge: { amount: '7.99', currency: 'USD' },
    };
    loadScript.mockResolvedValue(undefined);
    walletSheet.canMakePayment.mockResolvedValue({ applePay: true, googlePay: false });
    walletSheet.show.mockResolvedValue({
      ctok: 'ctok_wallet',
      type: 'apple_pay',
      payer: { email: 'someone-else@icloud.com' },
      shipping: null,
    });
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
      for (const key of ['whopCheckout.card_number', 'whopCheckout.expiry', 'whopCheckout.cvc']) {
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
    const applePay = () => screen.findByRole('button', { name: 'Apple Pay' });
    const googlePay = () => screen.queryByRole('button', { name: 'Google Pay' });

    it('prices the wallet sheet at the total the payer was shown, in minor units', async () => {
      render(<WhopCheckoutPage />);

      await applePay();
      expect(whop.payments.paymentRequest.create).toHaveBeenCalledWith({
        accountId: 'biz_1',
        amount: 799,
        currency: 'USD',
        requestPayerEmail: false,
      });
    });

    it('asks the sheet to save the card for renewals when the plan renews', async () => {
      location.state = { ...(location.state as object), renews: true };
      render(<WhopCheckoutPage />);

      await applePay();
      expect(whop.payments.paymentRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({ setupFutureUsage: 'off_session' }),
      );
    });

    it("keeps a currency's own precision, such as yen with no minor unit", async () => {
      location.state = {
        ...(location.state as object),
        charge: { amount: '1200', currency: 'JPY' },
      };
      render(<WhopCheckoutPage />);

      await applePay();
      expect(whop.payments.paymentRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1200, currency: 'JPY' }),
      );
    });

    it("shows Apple's own Apple Pay button, as Apple's guidelines require", async () => {
      const { container } = render(<WhopCheckoutPage />);

      await applePay();
      const button = container.querySelector('apple-pay-button');
      expect(button?.getAttribute('buttonstyle')).toBe('black');
      expect(button?.getAttribute('type')).toBe('plain');
      expect(button?.getAttribute('locale')).toBe('es');
      expect(loadScript).toHaveBeenCalledWith(
        'https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js',
      );
    });

    describe('Google Pay', () => {
      const createButton = vi.fn();
      const PaymentsClient = vi.fn(function PaymentsClient() {
        return { createButton };
      });

      beforeEach(() => {
        walletSheet.canMakePayment.mockResolvedValue({ applePay: false, googlePay: true });
        createButton.mockImplementation(({ onClick }: { onClick: () => void }) => {
          const button = document.createElement('button');
          button.setAttribute('aria-label', 'Google Pay');
          button.addEventListener('click', onClick);
          return button;
        });
        vi.stubGlobal('google', { payments: { api: { PaymentsClient } } });
      });

      it("shows Google's own button, as the Google Pay terms require", async () => {
        render(<WhopCheckoutPage />);

        await screen.findByRole('button', { name: 'Google Pay' });
        expect(loadScript).toHaveBeenCalledWith('https://pay.google.com/gp/p/js/pay.js');
        expect(PaymentsClient).toHaveBeenCalledWith({ environment: 'TEST' });
        expect(createButton).toHaveBeenCalledWith(
          expect.objectContaining({
            buttonColor: 'black',
            buttonType: 'plain',
            buttonSizeMode: 'fill',
            buttonLocale: 'es',
          }),
        );
        expect(screen.queryByRole('button', { name: 'Apple Pay' })).toBeNull();
      });

      it('opens the sheet with the checkout email', async () => {
        render(<WhopCheckoutPage />);

        fireEvent.click(await screen.findByRole('button', { name: 'Google Pay' }));

        expect(walletSheet.show).toHaveBeenCalledWith('google_pay', { email: 'payer@test.com' });
      });
    });

    it('offers Apple Pay alone where it is the native wallet, as on an iPhone', async () => {
      walletSheet.canMakePayment.mockResolvedValue({
        applePay: true,
        googlePay: true,
        order: ['apple_pay', 'google_pay'],
      });
      render(<WhopCheckoutPage />);

      expect(await applePay()).toBeTruthy();
      expect(loadScript).not.toHaveBeenCalledWith('https://pay.google.com/gp/p/js/pay.js');
    });

    it('offers both wallets, Google Pay first, where Google Pay is the native one', async () => {
      const createButton = vi.fn(() => {
        const button = document.createElement('button');
        button.setAttribute('aria-label', 'Google Pay');
        return button;
      });
      vi.stubGlobal('google', {
        payments: {
          api: {
            PaymentsClient: vi.fn(function PaymentsClient() {
              return { createButton };
            }),
          },
        },
      });
      walletSheet.canMakePayment.mockResolvedValue({
        applePay: true,
        googlePay: true,
        order: ['google_pay', 'apple_pay'],
      });
      render(<WhopCheckoutPage />);

      const googlePayButton = await screen.findByRole('button', { name: 'Google Pay' });
      const applePayButton = await applePay();
      expect(
        googlePayButton.compareDocumentPosition(applePayButton) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("offers only the wallets the payer's device can pay with", async () => {
      render(<WhopCheckoutPage />);

      expect(await applePay()).toBeTruthy();
      expect(googlePay()).toBeNull();
    });

    it('offers no wallet when the total the payer was shown is unknown', async () => {
      const { charge: _charge, ...withoutCharge } = location.state as { charge: object };
      location.state = withoutCharge;
      render(<WhopCheckoutPage />);

      await screen.findByTestId('card-number');
      expect(whop.payments.paymentRequest.create).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'Apple Pay' })).toBeNull();
    });

    it('opens the sheet with the checkout email, so the wallet never supplies its own', async () => {
      render(<WhopCheckoutPage />);

      fireEvent.click(await applePay());

      expect(walletSheet.show).toHaveBeenCalledWith('apple_pay', { email: 'payer@test.com' });
    });

    it('charges the wallet token through our backend under the checkout email', async () => {
      location.state = {
        ...(location.state as object),
        promo: { code: 'SPRING20', promoType: 'percentage', amountOff: 20, currency: 'usd' },
      };
      render(<WhopCheckoutPage />);

      fireEvent.click(await applePay());

      await waitFor(() =>
        expect(api.payPublicWhopCheckout).toHaveBeenCalledWith({
          ...REQUEST,
          confirmationToken: 'ctok_wallet',
          returnUrl: RETURN_URL,
          promoCode: 'SPRING20',
        }),
      );
      await waitFor(() =>
        expect(navigate).toHaveBeenCalledWith('/payment/success', { replace: true }),
      );
    });

    it('finishes a pending step such as 3DS, as the card charge does', async () => {
      api.payPublicWhopCheckout.mockResolvedValue({
        paymentId: 'pay_1',
        status: 'open',
        clientSecret: 'sec_1',
      });
      whop.payments.handleNextAction.mockResolvedValue({
        status: 'failed',
        redirected: false,
        lastPaymentError: { code: 'card_declined', message: 'Declined' },
      });
      render(<WhopCheckoutPage />);

      fireEvent.click(await applePay());

      expect((await screen.findByRole('alert')).textContent).toBe('Declined');
      expect(whop.payments.handleNextAction).toHaveBeenCalledWith({ clientSecret: 'sec_1' });
    });

    it('charges nothing and stays quiet when the payer dismisses the sheet', async () => {
      walletSheet.show.mockRejectedValue(new Error('payment_request_cancelled'));
      render(<WhopCheckoutPage />);

      fireEvent.click(await applePay());

      await waitFor(() => expect(walletSheet.show).toHaveBeenCalled());
      expect(api.payPublicWhopCheckout).not.toHaveBeenCalled();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('says so, and logs why, when the sheet could not open at all', async () => {
      const failure = new Error('walletUnavailable: the sheet could not open');
      const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
      walletSheet.show.mockRejectedValue(failure);
      render(<WhopCheckoutPage />);

      fireEvent.click(await applePay());

      expect((await screen.findByRole('alert')).textContent).toBe(
        'whopCheckout.errors.not_completed',
      );
      expect(logged).toHaveBeenCalledWith(expect.any(String), failure);
      expect(api.payPublicWhopCheckout).not.toHaveBeenCalled();
      logged.mockRestore();
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

    it("shows Whop's own explanation of why the payment failed", async () => {
      pendingPayment();
      whop.payments.handleNextAction.mockResolvedValue({
        status: 'requires_confirmation',
        redirected: false,
        lastPaymentError: {
          code: 'processing_error',
          decline_code: null,
          message: 'This amount is too low. It must be at least €0.44.',
        },
      });

      await renderFilledAndPay();

      expect((await screen.findByRole('alert')).textContent).toBe(
        'This amount is too low. It must be at least €0.44.',
      );
      expect(navigate).not.toHaveBeenCalled();
    });

    it('reports a decline in our own words when Whop gives no explanation', async () => {
      pendingPayment();
      whop.payments.handleNextAction.mockResolvedValue({
        status: 'failed',
        redirected: false,
        lastPaymentError: { code: 'card_declined', message: null },
      });

      await renderFilledAndPay();

      expect((await screen.findByRole('alert')).textContent).toBe('whopCheckout.errors.declined');
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
