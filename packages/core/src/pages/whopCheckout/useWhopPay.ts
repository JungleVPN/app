import { useWhop } from '@whop/elements-react';
import type { WhopPaymentStatusDto } from '@workspace/types';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../runtime';
import {
  checkoutEventProperties,
  forgetPendingPurchase,
  phCapture,
  rememberPendingPurchase,
} from '../../utils';
import { checkoutErrorKey } from '../getSubscription/checkoutErrors';
import type { WhopCheckoutState } from './whopCheckoutState';

/** Thrown when Whop cannot tokenise the card — its own field already marks what is wrong. */
export class CardTokenError extends Error {}

/** Thrown when a wallet sheet could not open or complete — anything but the payer dismissing it. */
export class WalletSheetError extends Error {}

/** A Whop payment status that needs nothing more from the payer. */
const SETTLED_STATUSES: ReadonlySet<string> = new Set(['succeeded', 'processing']);

/**
 * How long to wait for our webhook to extend the subscription once Whop says
 * paid. Whop reports the charge before its webhook lands, so showing success
 * on Whop's word alone would send the payer to a profile that is not yet
 * extended.
 */
const FULFILMENT_POLL_MS = 1000;
const FULFILMENT_POLL_ATTEMPTS = 60;

function payErrorKey(caught: unknown): string {
  if (caught instanceof CardTokenError) return 'whopCheckout.errors.card_invalid';
  if (caught instanceof WalletSheetError) return 'whopCheckout.errors.not_completed';
  return checkoutErrorKey(caught);
}

/**
 * Tokenises a payment method; resolves null when the payer backed out, such
 * as by dismissing a wallet sheet, and there is nothing to charge.
 */
export type Tokenise = () => Promise<string | null>;

/** Where the payer paid from, so only that place shows the progress and any failure. */
export type PayVia = 'card' | 'wallet';

/**
 * Charges a confirmation token through our backend — which re-validates the
 * checkout, charges it under the email the payer entered, and stamps the
 * webhook metadata — then hands any pending step such as 3DS to Whop. Shared
 * by the card form and the wallet buttons, so a wallet can never charge under
 * an email other than the checkout's.
 */
export function useWhopPay({
  checkout,
  returnUrl,
}: {
  checkout: WhopCheckoutState;
  returnUrl: string;
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
  const analytics = checkoutEventProperties({
    paymentProvider: 'whop',
    days: checkout.selectedPeriod,
  });

  /** Leaves the purchase for `/payment/success` to report to Google Ads. */
  const rememberPurchase = (paymentId: string) =>
    rememberPendingPurchase({
      transactionId: paymentId,
      ...(checkout.charge
        ? { value: Number(checkout.charge.amount), currency: checkout.charge.currency }
        : {}),
    });

  /** The paid payment's id, null when the payer left for an off-site step, or the text to show them. */
  const charge = async (
    confirmationToken: string,
  ): Promise<{ paid: string } | null | { error: string }> => {
    const payment = await paymentsApi.payPublicWhopCheckout({
      ...checkout.request,
      confirmationToken,
      returnUrl,
      ...(checkout.promo ? { promoCode: checkout.promo.code } : {}),
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

  /**
   * Our webhook's answer once it fulfilled the payment, or null when it did not
   * within the wait; a failed lookup just asks again.
   */
  const awaitFulfilment = async (paymentId: string): Promise<WhopPaymentStatusDto | null> => {
    for (let attempt = 0; attempt < FULFILMENT_POLL_ATTEMPTS; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, FULFILMENT_POLL_MS));
      const status = await paymentsApi.getPublicWhopPaymentStatus(paymentId).catch(() => null);
      if (status?.fulfilled) return status;
    }
    return null;
  };

  /**
   * Runs `tokenise` before anything else awaits, so a wallet sheet opens within
   * the tap. One payment at a time across the card and every wallet.
   */
  const pay = async ({ via, tokenise }: { via: PayVia; tokenise: Tokenise }): Promise<void> => {
    if (isLocked.current) return;
    isLocked.current = true;
    setPendingVia(via);
    setFailure(null);
    const fail = (message: string) => setFailure({ via, message });
    // Once charged, the form stays locked even if the webhook is late, so the payer cannot pay twice.
    let charged = false;
    try {
      const confirmationToken = await tokenise();
      if (!confirmationToken) return;
      phCapture('payment_submitted', analytics);
      setIsCharging(true);
      const outcome = await charge(confirmationToken);
      if (outcome && 'paid' in outcome) {
        charged = true;
        const fulfilled = await awaitFulfilment(outcome.paid);
        if (fulfilled) {
          // Only a customer's first payment is reported to Google Ads.
          if (fulfilled.firstPayment) rememberPurchase(outcome.paid);
          else forgetPendingPurchase();
          navigate(paymentReturnPath, { replace: true });
          return;
        }
        setIsCharging(false);
        fail(t('whopCheckout.errors.activation_delayed'));
        return;
      }
      if (outcome) {
        forgetPendingPurchase();
        fail(outcome.error);
      }
    } catch (caught) {
      forgetPendingPurchase();
      fail(t(payErrorKey(caught)));
    } finally {
      if (!charged) {
        isLocked.current = false;
        setPendingVia(null);
        setIsCharging(false);
      }
    }
  };

  return { pay, pendingVia, isCharging, failure };
}

export type WhopPay = ReturnType<typeof useWhopPay>;

/** The failure to show where the payer paid from `via`, if that is where it happened. */
export function failureFor({ failure }: WhopPay, via: PayVia): string | null {
  return failure?.via === via ? failure.message : null;
}
