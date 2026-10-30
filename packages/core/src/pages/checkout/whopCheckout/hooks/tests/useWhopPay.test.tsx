/**
 * useWhopPay — charging a tokenised payment method through our backend, then
 * waiting for our webhook to extend the subscription before sending the payer
 * on. One payment at a time across the card and every wallet, and a failure
 * shows only where the payer paid from.
 */
import { act, renderHook } from '@testing-library/react';
import { PROMO_CODE_INVALID_CODE, type WhopPaymentStatusDto } from '@workspace/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../../../../api';
import { checkoutErrorKey } from '../../../getSubscription/utils/checkoutErrors';
import { CardTokenError, WalletSheetError } from '../../utils/whopPayErrors';
import type { WhopCheckoutState } from '../../whopCheckoutState';
import { failureFor, useWhopPay } from '../useWhopPay';

const { api, whop, navigate, utils } = vi.hoisted(() => ({
  api: { payPublicWhopCheckout: vi.fn(), getPublicWhopPaymentStatus: vi.fn() },
  whop: { current: null as { payments: { handleNextAction: ReturnType<typeof vi.fn> } } | null },
  navigate: vi.fn(),
  utils: {
    getAdClicks: vi.fn().mockReturnValue(null),
    forgetPendingPurchase: vi.fn(),
    phCapture: vi.fn(),
    rememberPendingPurchase: vi.fn(),
    trackPaymentMethodSubmitted: vi.fn(),
  },
}));

vi.mock('@whop/elements-react', () => ({ useWhop: () => whop.current }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../../hooks', () => ({ useNavigation: () => navigate }));
vi.mock('../../../../../runtime', () => ({
  useAppRoutes: () => ({ paymentReturnPath: '/payment/return' }),
  usePaymentsApi: () => api,
}));
vi.mock('../../../../../utils', () => ({
  ...utils,
  checkoutEventProperties: (properties: object) => properties,
}));

afterEach(() => {
  vi.useRealTimers();
  whop.current = null;
});

const RETURN_URL = 'https://example.com/payment/return';

const checkoutState = (overrides: Partial<WhopCheckoutState> = {}): WhopCheckoutState => ({
  accountId: 'biz_1',
  whopPlanId: 'plan_1',
  request: { email: 'payer@test.com', planId: 'whop-30' },
  selectedPeriod: 30,
  charge: { amount: '9.99', currency: 'USD' },
  ...overrides,
});

const fulfilled = (firstPayment = true): WhopPaymentStatusDto =>
  ({ fulfilled: true, firstPayment }) as WhopPaymentStatusDto;

const renderPay = (checkout = checkoutState(), onPromoRejected = vi.fn()) =>
  renderHook(() => useWhopPay({ checkout, returnUrl: RETURN_URL, onPromoRejected }));

type Rendered = ReturnType<typeof renderPay>;

const payWith = (
  rendered: Rendered,
  tokenise: () => Promise<string | null>,
  method: 'card' | 'apple_pay' | 'google_pay' = 'card',
) => act(() => rendered.result.current.pay({ method, tokenise }));

const withNextAction = (outcome: object) => {
  whop.current = { payments: { handleNextAction: vi.fn().mockResolvedValue(outcome) } };
  api.payPublicWhopCheckout.mockResolvedValue({
    paymentId: 'pay_1',
    status: 'pending',
    clientSecret: 'secret_1',
  });
};

describe('useWhopPay when the charge is paid', () => {
  it('charges the token under the checkout request, with its promo code', async () => {
    api.payPublicWhopCheckout.mockResolvedValue({ paymentId: 'pay_1', status: 'paid' });
    api.getPublicWhopPaymentStatus.mockResolvedValue(fulfilled());
    const promo = { code: 'SPRING20', promoType: 'percentage', amountOff: 20, currency: 'usd' };
    const rendered = renderPay(checkoutState({ promo } as Partial<WhopCheckoutState>));

    await payWith(rendered, async () => 'ctok_1');

    expect(api.payPublicWhopCheckout).toHaveBeenCalledWith({
      email: 'payer@test.com',
      planId: 'whop-30',
      confirmationToken: 'ctok_1',
      returnUrl: RETURN_URL,
      promoCode: 'SPRING20',
    });
  });

  it('sends the last ad click along, so the paid purchase can be reported', async () => {
    utils.getAdClicks.mockReturnValueOnce({ gclid: 'g-1' });
    api.payPublicWhopCheckout.mockResolvedValue({ paymentId: 'pay_1', status: 'paid' });
    api.getPublicWhopPaymentStatus.mockResolvedValue(fulfilled());

    await payWith(renderPay(), async () => 'ctok_1');

    expect(api.payPublicWhopCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ adClicks: { gclid: 'g-1' } }),
    );
  });

  it('reports the submission once the payer has a token', async () => {
    api.payPublicWhopCheckout.mockResolvedValue({ paymentId: 'pay_1', status: 'paid' });
    api.getPublicWhopPaymentStatus.mockResolvedValue(fulfilled());
    const rendered = renderPay();

    await payWith(rendered, async () => 'ctok_1', 'apple_pay');

    expect(utils.phCapture).toHaveBeenCalledWith('payment_submitted', {
      paymentProvider: 'whop',
      days: 30,
    });
    expect(utils.trackPaymentMethodSubmitted).toHaveBeenCalledWith('apple_pay', {
      paymentProvider: 'whop',
      days: 30,
    });
  });

  it('leaves a first payment for the success page to report, then goes there', async () => {
    api.payPublicWhopCheckout.mockResolvedValue({ paymentId: 'pay_1', status: 'paid' });
    api.getPublicWhopPaymentStatus.mockResolvedValue(fulfilled(true));
    const rendered = renderPay();

    await payWith(rendered, async () => 'ctok_1');

    expect(api.getPublicWhopPaymentStatus).toHaveBeenCalledWith('pay_1');
    expect(utils.rememberPendingPurchase).toHaveBeenCalledWith({
      transactionId: 'pay_1',
      value: 9.99,
      currency: 'USD',
    });
    expect(navigate).toHaveBeenCalledWith('/payment/return', { replace: true });
  });

  it('reports no purchase for a renewal', async () => {
    api.payPublicWhopCheckout.mockResolvedValue({ paymentId: 'pay_1', status: 'paid' });
    api.getPublicWhopPaymentStatus.mockResolvedValue(fulfilled(false));
    const rendered = renderPay();

    await payWith(rendered, async () => 'ctok_1');

    expect(utils.rememberPendingPurchase).not.toHaveBeenCalled();
    expect(utils.forgetPendingPurchase).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/payment/return', { replace: true });
  });

  it('remembers a purchase without a value when the total was unknown', async () => {
    api.payPublicWhopCheckout.mockResolvedValue({ paymentId: 'pay_1', status: 'paid' });
    api.getPublicWhopPaymentStatus.mockResolvedValue(fulfilled(true));
    const rendered = renderPay(checkoutState({ charge: undefined }));

    await payWith(rendered, async () => 'ctok_1');

    expect(utils.rememberPendingPurchase).toHaveBeenCalledWith({ transactionId: 'pay_1' });
  });

  it('asks again when a status lookup fails', async () => {
    vi.useFakeTimers();
    api.payPublicWhopCheckout.mockResolvedValue({ paymentId: 'pay_1', status: 'paid' });
    api.getPublicWhopPaymentStatus
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ fulfilled: false })
      .mockResolvedValue(fulfilled());
    const rendered = renderPay();

    await act(async () => {
      const paying = rendered.result.current.pay({
        method: 'card',
        tokenise: async () => 'ctok_1',
      });
      await vi.advanceTimersByTimeAsync(2000);
      await paying;
    });

    expect(api.getPublicWhopPaymentStatus).toHaveBeenCalledTimes(3);
    expect(navigate).toHaveBeenCalled();
  });

  it('keeps the payer locked out, with a delay message, when the webhook is late', async () => {
    vi.useFakeTimers();
    api.payPublicWhopCheckout.mockResolvedValue({ paymentId: 'pay_1', status: 'paid' });
    api.getPublicWhopPaymentStatus.mockResolvedValue({ fulfilled: false });
    const rendered = renderPay();

    await act(async () => {
      const paying = rendered.result.current.pay({
        method: 'card',
        tokenise: async () => 'ctok_1',
      });
      await vi.advanceTimersByTimeAsync(60_000);
      await paying;
    });

    expect(api.getPublicWhopPaymentStatus).toHaveBeenCalledTimes(60);
    expect(navigate).not.toHaveBeenCalled();
    expect(failureFor(rendered.result.current, 'card')).toBe(
      'whopCheckout.errors.activation_delayed',
    );
    expect(rendered.result.current.isCharging).toBe(false);
    expect(rendered.result.current.pendingVia).toBe('card');

    const secondTokenise = vi.fn(async () => 'ctok_2');
    await payWith(rendered, secondTokenise);
    expect(secondTokenise).not.toHaveBeenCalled();
  });
});

describe('useWhopPay when Whop needs another step', () => {
  it('pays once the step settles, having left the purchase behind first', async () => {
    withNextAction({ status: 'succeeded' });
    api.getPublicWhopPaymentStatus.mockResolvedValue(fulfilled());
    const rendered = renderPay();

    await payWith(rendered, async () => 'ctok_1');

    expect(whop.current?.payments.handleNextAction).toHaveBeenCalledWith({
      clientSecret: 'secret_1',
    });
    expect(utils.rememberPendingPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: 'pay_1' }),
    );
    expect(navigate).toHaveBeenCalledWith('/payment/return', { replace: true });
  });

  it('treats a processing payment as paid', async () => {
    withNextAction({ status: 'processing' });
    api.getPublicWhopPaymentStatus.mockResolvedValue(fulfilled());
    const rendered = renderPay();

    await payWith(rendered, async () => 'ctok_1');

    expect(navigate).toHaveBeenCalled();
  });

  it('shows nothing and unlocks when the step left the page', async () => {
    withNextAction({ redirected: true });
    const rendered = renderPay();

    await payWith(rendered, async () => 'ctok_1');

    expect(rendered.result.current.failure).toBeNull();
    expect(rendered.result.current.pendingVia).toBeNull();
    expect(utils.forgetPendingPurchase).not.toHaveBeenCalled();
  });

  it.each([
    ['Whop’s own explanation', { message: ' Below the minimum ' }, 'Below the minimum'],
    ['a decline without one', { message: '  ' }, 'whopCheckout.errors.declined'],
  ])('shows %s when the step fails', async (_, lastPaymentError, expected) => {
    withNextAction({ status: 'failed', lastPaymentError });
    const rendered = renderPay();

    await payWith(rendered, async () => 'ctok_1');

    expect(failureFor(rendered.result.current, 'card')).toBe(expected);
    expect(utils.forgetPendingPurchase).toHaveBeenCalled();
  });

  it('says the payment was not completed when the step fails without a reason', async () => {
    withNextAction({ status: 'failed' });
    const rendered = renderPay();

    await payWith(rendered, async () => 'ctok_1');

    expect(failureFor(rendered.result.current, 'card')).toBe('whopCheckout.errors.not_completed');
  });

  it('says the payment was not completed when Whop gave no step to take', async () => {
    api.payPublicWhopCheckout.mockResolvedValue({ paymentId: 'pay_1', status: 'pending' });
    const rendered = renderPay();

    await payWith(rendered, async () => 'ctok_1');

    expect(failureFor(rendered.result.current, 'card')).toBe('whopCheckout.errors.not_completed');
    expect(utils.forgetPendingPurchase).toHaveBeenCalled();
  });
});

describe('useWhopPay when nothing is charged', () => {
  it('does nothing when the payer backs out of tokenising', async () => {
    const rendered = renderPay();

    await payWith(rendered, async () => null, 'google_pay');

    expect(api.payPublicWhopCheckout).not.toHaveBeenCalled();
    expect(utils.phCapture).not.toHaveBeenCalled();
    expect(rendered.result.current.failure).toBeNull();
    expect(rendered.result.current.pendingVia).toBeNull();
  });

  it('marks the card as invalid when Whop cannot tokenise it', async () => {
    const rendered = renderPay();

    await payWith(rendered, async () => {
      throw new CardTokenError();
    });

    expect(failureFor(rendered.result.current, 'card')).toBe('whopCheckout.errors.card_invalid');
    expect(failureFor(rendered.result.current, 'wallet')).toBeNull();
    expect(utils.forgetPendingPurchase).toHaveBeenCalled();
  });

  it('shows a wallet sheet failure on the wallet only', async () => {
    const rendered = renderPay();

    await payWith(
      rendered,
      async () => {
        throw new WalletSheetError();
      },
      'apple_pay',
    );

    expect(failureFor(rendered.result.current, 'wallet')).toBe('whopCheckout.errors.not_completed');
    expect(failureFor(rendered.result.current, 'card')).toBeNull();
  });

  it('explains a refused charge the way the checkout does', async () => {
    const refusal = new Error('refused');
    api.payPublicWhopCheckout.mockRejectedValue(refusal);
    const rendered = renderPay();

    await payWith(rendered, async () => 'ctok_1');

    expect(failureFor(rendered.result.current, 'card')).toBe(checkoutErrorKey(refusal));
    expect(rendered.result.current.pendingVia).toBeNull();
    expect(rendered.result.current.isCharging).toBe(false);
  });

  it('drops the promo code when the charge refuses it, explaining why', async () => {
    const refusal = new ApiClientError({
      status: 400,
      message: 'Bad Request',
      data: { code: PROMO_CODE_INVALID_CODE, reason: 'new_users_only' },
    });
    api.payPublicWhopCheckout.mockRejectedValue(refusal);
    const onPromoRejected = vi.fn();
    const rendered = renderPay(checkoutState(), onPromoRejected);

    await payWith(rendered, async () => 'ctok_1');

    expect(onPromoRejected).toHaveBeenCalledOnce();
    expect(failureFor(rendered.result.current, 'card')).toBe('payment.promo.alert.notNewUser');
  });

  it('keeps the promo code when the charge fails for another reason', async () => {
    api.payPublicWhopCheckout.mockRejectedValue(
      new ApiClientError({ status: 429, message: 'Too Many Requests', data: null }),
    );
    const onPromoRejected = vi.fn();
    const rendered = renderPay(checkoutState(), onPromoRejected);

    await payWith(rendered, async () => 'ctok_1');

    expect(onPromoRejected).not.toHaveBeenCalled();
  });

  it('clears the last failure when the payer tries again', async () => {
    const rendered = renderPay();
    await payWith(rendered, async () => {
      throw new CardTokenError();
    });

    await payWith(rendered, async () => null);

    expect(rendered.result.current.failure).toBeNull();
  });
});

describe('useWhopPay while a payment is under way', () => {
  it('ignores a second payment, from any method, until the first is done', async () => {
    let finishTokenising: (token: string | null) => void = () => {};
    const rendered = renderPay();
    const first = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          finishTokenising = resolve;
        }),
    );
    const second = vi.fn(async () => 'ctok_2');

    let paying: Promise<void> = Promise.resolve();
    act(() => {
      paying = rendered.result.current.pay({ method: 'card', tokenise: first });
    });
    expect(rendered.result.current.pendingVia).toBe('card');

    await payWith(rendered, second, 'apple_pay');
    expect(second).not.toHaveBeenCalled();

    await act(async () => {
      finishTokenising(null);
      await paying;
    });
    expect(rendered.result.current.pendingVia).toBeNull();
  });

  it('shows the charge in progress once the token is being charged', async () => {
    let finishCharge: (payment: object) => void = () => {};
    api.payPublicWhopCheckout.mockReturnValue(
      new Promise((resolve) => {
        finishCharge = resolve;
      }),
    );
    const rendered = renderPay();

    let paying: Promise<void> = Promise.resolve();
    await act(async () => {
      paying = rendered.result.current.pay({
        method: 'google_pay',
        tokenise: async () => 'ctok_1',
      });
    });
    expect(rendered.result.current.isCharging).toBe(true);
    expect(rendered.result.current.pendingVia).toBe('wallet');

    await act(async () => {
      finishCharge({ paymentId: 'pay_1', status: 'pending' });
      await paying;
    });
    expect(rendered.result.current.isCharging).toBe(false);
  });
});
