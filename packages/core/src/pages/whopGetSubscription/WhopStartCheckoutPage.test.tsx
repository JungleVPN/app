/**
 * WhopStartCheckoutPage — the email step and order summary before a Whop
 * payment. A promo code is checked here, against the plan being bought, and
 * handed to the checkout route: Whop fixes a checkout's promo code when the
 * checkout opens, so the code is settled before it does.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PROMO_CODE_INVALID_CODE } from '@workspace/types';
import { type ReactNode, useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../api';
import WhopStartCheckoutPage from './WhopStartCheckoutPage';

const {
  navigate,
  api,
  trackCheckoutStarted,
  loadPlans,
  checkoutState,
  pay,
  wallets,
  showWalletSheet,
  cardSubmit,
  cardPanel,
} = vi.hoisted(() => ({
  navigate: vi.fn(),
  pay: vi.fn(),
  cardSubmit: vi.fn(),
  cardPanel: { checkout: null as Record<string, unknown> | null },
  showWalletSheet: vi.fn(),
  wallets: {
    sheet: null as object | null,
    available: [] as string[],
    isReady: true,
    chargingVia: null as 'card' | 'wallet' | null,
  },
  loadPlans: vi.fn(),
  checkoutState: { loadFailed: false },
  trackCheckoutStarted: vi.fn(),
  api: { createPublicWhopCheckout: vi.fn(), checkPublicWhopPromoCode: vi.fn() },
}));

const REQUEST = { email: 'payer@test.com', planId: 'whop-30', selectedPeriod: 30 };

vi.mock('../getSubscription/useCheckout', () => ({
  useCheckout: (startCheckout: (request: typeof REQUEST) => Promise<void>) => ({
    plan: {
      planId: 'whop-30',
      days: 30,
      planPricing: {
        total: '10.00',
        monthly: '10.00',
        fullTotal: '12.00',
        discountPercent: 17,
        currencyCode: 'USD',
      },
    },
    selectedPeriod: 30,
    isAuthenticated: false,
    isLoading: false,
    email: REQUEST.email,
    emailError: '',
    checkoutError: null,
    isPending: false,
    activeSubscriptionEmail: null,
    handleEmailChange: () => {},
    handleSubmit: async () => {
      await startCheckout(REQUEST);
      return true;
    },
    dismissActiveSubscription: () => {},
    loadFailed: checkoutState.loadFailed,
  }),
}));
vi.mock('../getSubscription/CheckoutForm', () => ({
  CheckoutForm: ({
    promoCodeSlot,
    paymentMethodsSlot,
    isPaymentLoading,
    submitSlot,
    promoDiscount,
    taxNote,
    canSubmit,
    completeEmailStep,
    handleSubmit,
  }: {
    promoCodeSlot?: ReactNode;
    paymentMethodsSlot?: ReactNode;
    isPaymentLoading?: boolean;
    submitSlot?: ReactNode;
    promoDiscount?: { total?: string; label: string };
    taxNote?: string;
    canSubmit: boolean;
    completeEmailStep: () => void;
    handleSubmit: () => void;
  }) => (
    <>
      {promoCodeSlot}
      {paymentMethodsSlot}
      {taxNote && <p data-testid='order-tax-note'>{taxNote}</p>}
      {promoDiscount && (
        <p data-testid='order-discount'>
          {promoDiscount.total ?? 'unchanged'} · {promoDiscount.label}
        </p>
      )}
      {isPaymentLoading && <p data-testid='payment-loading'>loading</p>}
      <p data-testid='can-submit'>{String(canSubmit)}</p>
      <button type='button' onClick={completeEmailStep}>
        common.next
      </button>
      {submitSlot ?? (
        <button type='button' onClick={handleSubmit}>
          getSubscription.submit
        </button>
      )}
    </>
  ),
}));
vi.mock('../whopGetSubscription/WhopPaymentTabs', () => ({
  WhopPaymentTabs: ({
    wallets: available,
    selected,
    cardPanel: card,
    onSelect,
  }: {
    wallets: string[];
    selected: string;
    cardPanel: ReactNode;
    onSelect: (method: string) => void;
  }) => (
    <div data-testid='selected-method' data-selected={selected}>
      {[...available, 'card'].map((method) => (
        <button key={method} type='button' onClick={() => onSelect(method)}>
          tab:{method}
        </button>
      ))}
      {selected === 'card' && card}
    </div>
  ),
}));
vi.mock('./WhopCardPanel', () => ({
  WhopCardPanel: ({
    checkout,
    submitRef,
    onCanPayChange,
  }: {
    checkout: Record<string, unknown>;
    submitRef: { current: () => void };
    onCanPayChange: (canPay: boolean) => void;
  }) => {
    cardPanel.checkout = checkout;
    submitRef.current = cardSubmit;
    useEffect(() => onCanPayChange(true), [onCanPayChange]);
    return <p>card-inputs</p>;
  },
}));
vi.mock('../whopCheckout/walletButtons', () => ({
  ApplePayButton: ({ onClick }: { onClick: () => void }) => (
    <button type='button' onClick={onClick}>
      apple-pay-button
    </button>
  ),
  GooglePayButton: ({ onClick }: { onClick: () => void }) => (
    <button type='button' onClick={onClick}>
      google-pay-button
    </button>
  ),
}));
vi.mock('@whop/elements', () => ({ loadWhop: () => ({}) }));
vi.mock('@whop/elements-react', () => ({
  WhopElements: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../whopCheckout/whopEnv', () => ({
  getWhopEnvironment: () => 'sandbox',
  toWhopLocale: () => 'en',
}));
vi.mock('../whopCheckout/WhopPaymentProcessingDrawer', () => ({
  WhopPaymentProcessingDrawer: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <p data-testid='processing-drawer'>processing</p> : null,
}));
vi.mock('../whopCheckout/useWhopPay', () => ({
  useWhopPay: () => ({
    pay,
    pendingVia: wallets.chargingVia,
    isCharging: wallets.chargingVia !== null,
    failure: null,
  }),
  failureFor: () => null,
}));
vi.mock('../whopCheckout/whopWallets', () => ({
  useWhopWalletSheet: () => ({
    sheet: wallets.sheet,
    wallets: wallets.available,
    isReady: wallets.isReady,
  }),
  showWalletSheet,
}));
vi.mock('../getSubscription/ActiveSubscriptionDialog', () => ({
  ActiveSubscriptionDialog: () => null,
}));
vi.mock('../../components', () => ({
  Loading: () => <p>loading</p>,
  LoadError: ({ reason, onRetry }: { reason: string; onRetry: () => void }) => (
    <button type='button' data-reason={reason} onClick={onRetry}>
      retry
    </button>
  ),
}));
vi.mock('../../hooks', () => ({ useNavigation: () => navigate, loadPlans }));
vi.mock('../../runtime', () => ({
  useAppRoutes: () => ({ paddleCheckoutPath: '/checkout', paymentReturnPath: '/payment/return' }),
  usePaymentsApi: () => api,
}));
vi.mock('../../utils', () => ({
  getReferralUserId: () => 7,
  trackCheckoutStarted,
  formatIntlPrice: (amount: string, currency: string) => `${amount} ${currency}`,
}));
vi.mock('../../ui', () => ({
  Paragraph: ({ children, ...props }: { children: ReactNode }) => <p {...props}>{children}</p>,
}));
vi.mock('../../core/i18n', () => ({ i18n: { language: 'en' } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const SPRING20 = { code: 'SPRING20', promoType: 'percentage', amountOff: 20, currency: 'usd' };

const promoInput = () => screen.getByLabelText('whopCheckout.promo_code');
const applyButton = () => screen.getByRole('button', { name: 'whopCheckout.promo_apply' });
const startButton = () => screen.getByRole('button', { name: 'getSubscription.submit' });

const applyPromo = (code: string) => {
  fireEvent.change(promoInput(), { target: { value: code } });
  fireEvent.click(applyButton());
};

const nextButton = () => screen.getByRole('button', { name: 'common.next' });
const canSubmit = () => screen.getByTestId('can-submit').textContent;

/** Passes the email step, then presses submit once the payment step can take it. */
const startPayment = async () => {
  fireEvent.click(nextButton());
  await waitFor(() => expect(canSubmit()).toBe('true'));
  fireEvent.click(startButton());
};

const handedOverState = () => cardPanel.checkout as Record<string, unknown>;
const orderDiscount = () => screen.queryByTestId('order-discount')?.textContent ?? null;
const discountShown = () => screen.findByTestId('order-discount');

describe('WhopStartCheckoutPage', () => {
  beforeEach(() => {
    checkoutState.loadFailed = false;
    wallets.sheet = null;
    wallets.available = [];
    wallets.isReady = true;
    wallets.chargingVia = null;
    cardPanel.checkout = null;
    vi.clearAllMocks();
    api.createPublicWhopCheckout.mockResolvedValue({
      accountId: 'biz_1',
      planId: 'plan_1',
      renews: true,
    });
  });

  it('tells the payer the price already includes tax, since Whop plans are tax-inclusive', () => {
    render(<WhopStartCheckoutPage />);

    expect(screen.getByTestId('order-tax-note').textContent).toBe(
      'getSubscription.tax_included_note',
    );
  });

  it('checks a promo code against the plan being bought and prices the order with it', async () => {
    api.checkPublicWhopPromoCode.mockResolvedValue(SPRING20);
    render(<WhopStartCheckoutPage />);

    applyPromo(' spring20 ');

    await discountShown();
    expect(orderDiscount()).toBe('8.00 · getSubscription.promo_discount');
    expect(api.checkPublicWhopPromoCode).toHaveBeenCalledWith({
      planId: 'whop-30',
      promoCode: 'spring20',
    });
  });

  it('takes a fixed amount off the order total', async () => {
    api.checkPublicWhopPromoCode.mockResolvedValue({
      ...SPRING20,
      promoType: 'flat_amount',
      amountOff: 2.5,
    });
    render(<WhopStartCheckoutPage />);

    applyPromo('FIVE');

    await discountShown();
    expect(orderDiscount()).toBe('7.50 · getSubscription.promo_discount');
  });

  it('names a fixed amount in another currency without repricing the order', async () => {
    api.checkPublicWhopPromoCode.mockResolvedValue({
      ...SPRING20,
      promoType: 'flat_amount',
      amountOff: 5,
      currency: 'eur',
    });
    render(<WhopStartCheckoutPage />);

    applyPromo('FIVE');

    await discountShown();
    expect(orderDiscount()).toBe('unchanged · getSubscription.promo_discount_amount');
  });

  it('shows the applied code as a chip in place of the field', async () => {
    api.checkPublicWhopPromoCode.mockResolvedValue(SPRING20);
    render(<WhopStartCheckoutPage />);

    applyPromo('spring20');
    await discountShown();

    expect(screen.getByText('SPRING20')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'whopCheckout.promo_remove' })).toBeTruthy();
    expect(screen.queryByLabelText('whopCheckout.promo_code')).toBeNull();
  });

  it('applies the code on Enter without starting the checkout', async () => {
    api.checkPublicWhopPromoCode.mockResolvedValue(SPRING20);
    render(<WhopStartCheckoutPage />);

    fireEvent.change(promoInput(), { target: { value: 'spring20' } });
    fireEvent.keyDown(promoInput(), { key: 'Enter' });

    expect(await discountShown()).toBeTruthy();
    expect(api.createPublicWhopCheckout).not.toHaveBeenCalled();
  });

  it('cannot apply an empty code', () => {
    render(<WhopStartCheckoutPage />);

    expect(applyButton().hasAttribute('disabled')).toBe(true);
  });

  it('says so when the code does not apply to the plan', async () => {
    api.checkPublicWhopPromoCode.mockRejectedValue(
      new ApiClientError({
        status: 400,
        message: 'Bad Request',
        data: { code: PROMO_CODE_INVALID_CODE },
      }),
    );
    render(<WhopStartCheckoutPage />);

    applyPromo('NOPE');

    expect(await screen.findByText('whopCheckout.errors.promo_invalid')).toBeTruthy();
    expect(orderDiscount()).toBeNull();
  });

  it('explains a check that failed for another reason, such as too many attempts', async () => {
    api.checkPublicWhopPromoCode.mockRejectedValue(
      new ApiClientError({ status: 429, message: 'Too Many Requests', data: null }),
    );
    render(<WhopStartCheckoutPage />);

    applyPromo('SPRING20');

    expect(await screen.findByText('getSubscription.throttled_error')).toBeTruthy();
  });

  it('pays the card with the applied code, on the total the payer was shown', async () => {
    api.checkPublicWhopPromoCode.mockResolvedValue(SPRING20);
    render(<WhopStartCheckoutPage />);
    applyPromo('spring20');
    await discountShown();

    await startPayment();

    expect(handedOverState()).toEqual({
      accountId: 'biz_1',
      whopPlanId: 'plan_1',
      renews: true,
      request: {
        email: 'payer@test.com',
        planId: 'whop-30',
        toltReferralId: null,
        inviterId: 7,
      },
      selectedPeriod: 30,
      promo: SPRING20,
      charge: { amount: '8.00', currency: 'USD' },
    });
    expect(cardSubmit).toHaveBeenCalledTimes(1);
  });

  it('prices the card payment at the total the payer was shown', async () => {
    render(<WhopStartCheckoutPage />);

    await startPayment();

    expect(handedOverState().charge).toEqual({ amount: '10.00', currency: 'USD' });
  });

  it('has no total when a fixed amount in another currency leaves it unknown', async () => {
    api.checkPublicWhopPromoCode.mockResolvedValue({
      ...SPRING20,
      promoType: 'flat_amount',
      amountOff: 5,
      currency: 'eur',
    });
    render(<WhopStartCheckoutPage />);
    applyPromo('FIVE');
    await discountShown();

    await startPayment();

    expect(handedOverState()).not.toHaveProperty('charge');
  });

  it('starts the checkout at full price when no code was applied', async () => {
    render(<WhopStartCheckoutPage />);

    await startPayment();

    expect(handedOverState()).not.toHaveProperty('promo');
  });

  it('goes back to full price, with an empty field, once the payer removes the code', async () => {
    api.checkPublicWhopPromoCode.mockResolvedValue(SPRING20);
    render(<WhopStartCheckoutPage />);
    applyPromo('spring20');
    await discountShown();

    fireEvent.click(screen.getByRole('button', { name: 'whopCheckout.promo_remove' }));

    expect(orderDiscount()).toBeNull();
    expect(promoInput()).toHaveProperty('value', '');
    await startPayment();
    expect(handedOverState()).not.toHaveProperty('promo');
  });

  it('reports the checkout starting, with the plan being bought', async () => {
    render(<WhopStartCheckoutPage />);

    fireEvent.click(nextButton());

    await waitFor(() =>
      expect(trackCheckoutStarted).toHaveBeenCalledWith({ paymentProvider: 'whop', days: 30 }),
    );
  });

  it('offers a retry instead of the form when the plans could not be loaded', () => {
    checkoutState.loadFailed = true;
    render(<WhopStartCheckoutPage />);
    expect(screen.getByRole('button', { name: 'retry' }).getAttribute('data-reason')).toBe(
      'failed_to_load_plans',
    );

    fireEvent.click(screen.getByRole('button', { name: 'retry' }));

    expect(screen.queryByRole('button', { name: 'common.next' })).toBeNull();
    expect(loadPlans).toHaveBeenCalledTimes(1);
  });

  it('accepts the checkout on Next without leaving the page', async () => {
    render(<WhopStartCheckoutPage />);
    expect(canSubmit()).toBe('false');

    fireEvent.click(nextButton());

    await waitFor(() => expect(canSubmit()).toBe('true'));
    expect(api.createPublicWhopCheckout).toHaveBeenCalledTimes(1);
  });

  it('shows the card inputs and pays the card from the submit button on the card tab', async () => {
    render(<WhopStartCheckoutPage />);

    await startPayment();

    expect(screen.getByText('card-inputs')).toBeTruthy();
    expect(cardSubmit).toHaveBeenCalledTimes(1);
    expect(pay).not.toHaveBeenCalled();
  });

  it('opens the wallet sheet instead when a wallet tab is selected', async () => {
    wallets.sheet = { show: vi.fn() };
    wallets.available = ['apple_pay', 'google_pay'];
    render(<WhopStartCheckoutPage />);

    fireEvent.click(nextButton());
    await waitFor(() => expect(canSubmit()).toBe('true'));
    expect(screen.getByTestId('selected-method').dataset.selected).toBe('apple_pay');
    expect(screen.queryByRole('button', { name: 'getSubscription.submit' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'apple-pay-button' }));

    expect(pay).toHaveBeenCalledWith({ via: 'wallet', tokenise: expect.any(Function) });
    expect(cardSubmit).not.toHaveBeenCalled();
    pay.mock.calls[0]?.[0].tokenise();
    expect(showWalletSheet).toHaveBeenCalledWith(wallets.sheet, 'apple_pay', 'payer@test.com');
  });

  it('pays with the wallet the payer picked', async () => {
    wallets.sheet = { show: vi.fn() };
    wallets.available = ['apple_pay', 'google_pay'];
    render(<WhopStartCheckoutPage />);

    fireEvent.click(nextButton());
    fireEvent.click(await screen.findByRole('button', { name: 'tab:google_pay' }));
    await waitFor(() => expect(canSubmit()).toBe('true'));
    fireEvent.click(screen.getByRole('button', { name: 'google-pay-button' }));

    pay.mock.calls[0]?.[0].tokenise();
    expect(showWalletSheet).toHaveBeenCalledWith(wallets.sheet, 'google_pay', 'payer@test.com');
  });

  it('cannot pay by wallet before its sheet is ready', async () => {
    wallets.available = ['apple_pay'];
    render(<WhopStartCheckoutPage />);

    fireEvent.click(nextButton());

    await waitFor(() => expect(api.createPublicWhopCheckout).toHaveBeenCalled());
    expect(canSubmit()).toBe('false');
  });

  it('shows a spinner for the payment methods until the wallets are known', async () => {
    wallets.isReady = false;
    render(<WhopStartCheckoutPage />);

    fireEvent.click(nextButton());

    await waitFor(() => expect(api.createPublicWhopCheckout).toHaveBeenCalled());
    expect(screen.getByTestId('payment-loading')).toBeTruthy();
    expect(screen.queryByTestId('selected-method')).toBeNull();
  });

  it('shows the payment methods once they are loaded', async () => {
    render(<WhopStartCheckoutPage />);

    fireEvent.click(nextButton());

    await waitFor(() => expect(screen.getByTestId('selected-method')).toBeTruthy());
    expect(screen.queryByTestId('payment-loading')).toBeNull();
  });

  it('shows no processing drawer while nothing is being charged', () => {
    render(<WhopStartCheckoutPage />);

    expect(screen.queryByTestId('processing-drawer')).toBeNull();
  });

  it.each([
    'card',
    'wallet',
  ] as const)('shows the processing drawer while a %s payment is charging', (via) => {
    wallets.chargingVia = via;

    render(<WhopStartCheckoutPage />);

    expect(screen.getByTestId('processing-drawer')).toBeTruthy();
  });
});
