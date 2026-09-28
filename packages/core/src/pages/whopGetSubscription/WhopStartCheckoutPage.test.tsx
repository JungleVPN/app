/**
 * WhopStartCheckoutPage — the email step and order summary before a Whop
 * payment. A promo code is checked here, against the plan being bought, and
 * handed to the checkout route: Whop fixes a checkout's promo code when the
 * checkout opens, so the code is settled before it does.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PROMO_CODE_INVALID_CODE } from '@workspace/types';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../api';
import WhopStartCheckoutPage from './WhopStartCheckoutPage';

const { navigate, api } = vi.hoisted(() => ({
  navigate: vi.fn(),
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
    handleSubmit: () => startCheckout(REQUEST),
    dismissActiveSubscription: () => {},
  }),
}));
vi.mock('../getSubscription/CheckoutForm', () => ({
  CheckoutForm: ({
    promoCodeSlot,
    promoDiscount,
    taxNote,
    handleSubmit,
  }: {
    promoCodeSlot?: ReactNode;
    promoDiscount?: { total?: string; label: string };
    taxNote?: string;
    handleSubmit: () => void;
  }) => (
    <>
      {promoCodeSlot}
      {taxNote && <p data-testid='order-tax-note'>{taxNote}</p>}
      {promoDiscount && (
        <p data-testid='order-discount'>
          {promoDiscount.total ?? 'unchanged'} · {promoDiscount.label}
        </p>
      )}
      <button type='button' onClick={handleSubmit}>
        getSubscription.submit
      </button>
    </>
  ),
}));
vi.mock('../getSubscription/ActiveSubscriptionDialog', () => ({
  ActiveSubscriptionDialog: () => null,
}));
vi.mock('../../components', () => ({ Loading: () => <p>loading</p> }));
vi.mock('../../hooks', () => ({ useNavigation: () => navigate }));
vi.mock('../../runtime', () => ({
  useAppRoutes: () => ({ paddleCheckoutPath: '/checkout' }),
  usePaymentsApi: () => api,
}));
vi.mock('../../utils', () => ({
  getReferralUserId: () => 7,
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

const handedOverState = () => navigate.mock.lastCall?.[1].state;
const orderDiscount = () => screen.queryByTestId('order-discount')?.textContent ?? null;
const discountShown = () => screen.findByTestId('order-discount');

describe('WhopStartCheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.createPublicWhopCheckout.mockResolvedValue({ accountId: 'biz_1', planId: 'plan_1' });
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

  it('hands the applied code to the checkout route, which opens the checkout with it', async () => {
    api.checkPublicWhopPromoCode.mockResolvedValue(SPRING20);
    render(<WhopStartCheckoutPage />);
    applyPromo('spring20');
    await discountShown();

    fireEvent.click(startButton());

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith('/checkout', {
      state: {
        accountId: 'biz_1',
        whopPlanId: 'plan_1',
        request: {
          email: 'payer@test.com',
          planId: 'whop-30',
          toltReferralId: null,
          inviterId: 7,
        },
        selectedPeriod: 30,
        promo: SPRING20,
        charge: { amount: '8.00', currency: 'USD' },
      },
    });
  });

  it('hands over the total the payer was shown, which a wallet sheet displays', async () => {
    render(<WhopStartCheckoutPage />);

    fireEvent.click(startButton());

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(handedOverState().charge).toEqual({ amount: '10.00', currency: 'USD' });
  });

  it('hands over no total when a fixed amount in another currency leaves it unknown', async () => {
    api.checkPublicWhopPromoCode.mockResolvedValue({
      ...SPRING20,
      promoType: 'flat_amount',
      amountOff: 5,
      currency: 'eur',
    });
    render(<WhopStartCheckoutPage />);
    applyPromo('FIVE');
    await discountShown();

    fireEvent.click(startButton());

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(handedOverState()).not.toHaveProperty('charge');
  });

  it('starts the checkout at full price when no code was applied', async () => {
    render(<WhopStartCheckoutPage />);

    fireEvent.click(startButton());

    await waitFor(() => expect(navigate).toHaveBeenCalled());
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
    fireEvent.click(startButton());
    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(handedOverState()).not.toHaveProperty('promo');
  });
});
