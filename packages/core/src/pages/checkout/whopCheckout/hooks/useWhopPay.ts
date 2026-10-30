import { useWhop } from '@whop/elements-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../../../runtime';
import {
  checkoutEventProperties,
  forgetPendingPurchase,
  getAdClicks,
  phCapture,
  rememberPendingPurchase,
  type SubmittedPaymentMethod,
  trackPaymentMethodSubmitted,
} from '../../../../utils';
import { isPromoCodeInvalidError } from '../../getSubscription/utils/checkoutErrors';
import { awaitFulfilment } from '../utils/awaitFulfilment';
import { payErrorKey } from '../utils/whopPayErrors';
import type { WhopCheckoutState } from '../whopCheckoutState';

/** A Whop payment status that needs nothing more from the payer. */
const SETTLED_STATUSES: ReadonlySet<string> = new Set(['succeeded', 'processing']);

/**
 * Tokenises a payment method; resolves null when the payer backed out, such
 * as by dismissing a wallet sheet, and there is nothing to charge.
 */
export type Tokenise = () => Promise<string | null>;

/** Where the payer paid from, so only that place shows the progress and any failure. */
export type PayVia = 'card' | 'wallet';

/** The paid payment's id, null when the payer left for an off-site step, or the text to show them. */
type ChargeOutcome = { paid: string } | { error: string } | null;

/**
 * Charges a confirmation token through our backend — which re-validates the
 * checkout, charges it under the email the payer entered, and stamps the
 * webhook metadata — then hands any pending step such as 3DS to Whop. Shared
 * by the card form and the wallet buttons, so a wallet can never charge under
 * an email other than the checkout's. A promo code Whop refuses for this payer
 * is reported through `onPromoRejected`, so the page can drop it for a retry.
 */
export function useWhopPay({
  checkout,
  returnUrl,
  onPromoRejected,
}: {
  checkout: WhopCheckoutState;
  returnUrl: string;
  onPromoRejected: () => void;
}) {
  const { t } = useTranslation();
  const whop = useWhop();
  const paymentsApi = usePaymentsApi();
  const navigate = useNavigation();
  const { paymentReturnPath } = useAppRoutes();
  const [pendingVia, setPendingVia] = useState<PayVia | null>(null);
  // Past tokenising: the wallet sheet has closed and the payer is waiting on us.
  const [isCharging, setIsCharging] = useState(false);
  const [failure, setFailure] = useState<{ via: PayVia; message: string } | null>(null);
  // State lags a render behind; a second tap in the same frame must still see the lock.
  const isLocked = useRef(false);

  const trackSubmitted = (method: SubmittedPaymentMethod) => {
    const properties = { paymentProvider: 'whop', days: checkout.selectedPeriod } as const;
    phCapture('payment_submitted', checkoutEventProperties(properties));
    trackPaymentMethodSubmitted(method, properties);
  };

  /** Leaves the purchase for `/payment/success` to report to Google Ads. */
  const rememberPurchase = (paymentId: string) =>
    rememberPendingPurchase({
      transactionId: paymentId,
      ...(checkout.charge
        ? { value: Number(checkout.charge.amount), currency: checkout.charge.currency }
        : {}),
    });

  const charge = async (confirmationToken: string): Promise<ChargeOutcome> => {
    const payment = await paymentsApi.payPublicWhopCheckout({
      ...checkout.request,
      confirmationToken,
      returnUrl,
      ...(checkout.promo ? { promoCode: checkout.promo.code } : {}),
      adClicks: getAdClicks(),
    });
    const paid = { paid: payment.paymentId };
    if (payment.status === 'paid') return paid;
    if (!whop || !payment.clientSecret) return { error: t('whopCheckout.errors.not_completed') };

    // An off-site step returns the payer straight to the success page, so the
    // purchase is left behind first; a step that fails on the page drops it.
    rememberPurchase(payment.paymentId);
    const result = await whop.payments.handleNextAction({ clientSecret: payment.clientSecret });
    if (result.redirected) return null;
    if (SETTLED_STATUSES.has(result.status)) return paid;
    const { lastPaymentError } = result;
    if (!lastPaymentError) return { error: t('whopCheckout.errors.not_completed') };
    // Whop's own explanation, such as a charge below its minimum, says more than a generic decline.
    return { error: lastPaymentError.message?.trim() || t('whopCheckout.errors.declined') };
  };

  /** Sends the payer on once our webhook extended their subscription; false when it is late. */
  const finishPaid = async (paymentId: string): Promise<boolean> => {
    const fulfilled = await awaitFulfilment(() =>
      paymentsApi.getPublicWhopPaymentStatus(paymentId),
    );
    if (!fulfilled) return false;
    // Only a customer's first payment is reported to Google Ads.
    if (fulfilled.firstPayment) rememberPurchase(paymentId);
    else forgetPendingPurchase();
    navigate(paymentReturnPath, { replace: true });
    return true;
  };

  const unlock = () => {
    isLocked.current = false;
    setPendingVia(null);
    setIsCharging(false);
  };

  /**
   * Runs `tokenise` before anything else awaits, so a wallet sheet opens within
   * the tap. One payment at a time across the card and every wallet.
   */
  const pay = async ({
    method,
    tokenise,
  }: {
    method: SubmittedPaymentMethod;
    tokenise: Tokenise;
  }): Promise<void> => {
    if (isLocked.current) return;
    const via: PayVia = method === 'card' ? 'card' : 'wallet';
    isLocked.current = true;
    setPendingVia(via);
    setFailure(null);
    const fail = (message: string) => setFailure({ via, message });
    // Once charged, the form stays locked even if the webhook is late, so the payer cannot pay twice.
    let charged = false;
    try {
      const confirmationToken = await tokenise();
      if (!confirmationToken) return;
      trackSubmitted(method);
      setIsCharging(true);

      const outcome = await charge(confirmationToken);
      if (!outcome) return;
      if ('error' in outcome) {
        forgetPendingPurchase();
        fail(outcome.error);
        return;
      }

      charged = true;
      if (await finishPaid(outcome.paid)) return;
      setIsCharging(false);
      fail(t('whopCheckout.errors.activation_delayed'));
    } catch (caught) {
      forgetPendingPurchase();
      if (isPromoCodeInvalidError(caught)) onPromoRejected();
      fail(t(payErrorKey(caught)));
    } finally {
      if (!charged) unlock();
    }
  };

  return { pay, pendingVia, isCharging, failure };
}

export type WhopPay = ReturnType<typeof useWhopPay>;

/** The failure to show where the payer paid from `via`, if that is where it happened. */
export function failureFor({ failure }: WhopPay, via: PayVia): string | null {
  return failure?.via === via ? failure.message : null;
}
