import { useWhop } from '@whop/elements-react';
import type { WhopPaymentStatusDto } from '@workspace/types';
import { useState } from 'react';
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

/** The last segment of an error's i18n key, such as `card_invalid`, as PostHog reports why a payment failed. */
const failureReason = (errorKey: string) => errorKey.slice(errorKey.lastIndexOf('.') + 1);

/** Why a charge did not go through: the text shown to the payer, and the reason reported to PostHog. */
type ChargeFailure = { error: string; reason: string };

/**
 * Tokenises a payment method; resolves null when the payer backed out, such
 * as by dismissing a wallet sheet, and there is nothing to charge.
 */
export type Tokenise = () => Promise<string | null>;

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
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analytics = checkoutEventProperties({
    paymentProvider: 'whop',
    days: checkout.selectedPeriod,
  });

  const fail = ({ error, reason }: ChargeFailure) => {
    forgetPendingPurchase();
    setError(error);
    phCapture('payment_failed', { ...analytics, reason });
  };

  /** Leaves the purchase for `/payment/success` to report to Google Ads. */
  const rememberPurchase = (paymentId: string) =>
    rememberPendingPurchase({
      transactionId: paymentId,
      ...(checkout.charge
        ? { value: Number(checkout.charge.amount), currency: checkout.charge.currency }
        : {}),
    });

  const notCompleted = (): ChargeFailure => ({
    error: t('whopCheckout.errors.not_completed'),
    reason: 'not_completed',
  });

  /** The paid payment's id, null when the payer left for an off-site step, or why it failed. */
  const charge = async (
    confirmationToken: string,
  ): Promise<{ paid: string } | null | ChargeFailure> => {
    const payment = await paymentsApi.payPublicWhopCheckout({
      ...checkout.request,
      confirmationToken,
      returnUrl,
      ...(checkout.promo ? { promoCode: checkout.promo.code } : {}),
    });
    const paid = { paid: payment.paymentId };
    if (payment.status === 'paid') return paid;
    if (!whop || !payment.clientSecret) return notCompleted();

    // An off-site step returns the payer straight to the success page, so the
    // purchase is left behind first; a step that fails on the page drops it.
    rememberPurchase(payment.paymentId);
    const result = await whop.payments.handleNextAction({ clientSecret: payment.clientSecret });
    if (result.redirected) return null;
    if (SETTLED_STATUSES.has(result.status)) return paid;
    const { lastPaymentError } = result;
    if (!lastPaymentError) return notCompleted();
    // Whop's own explanation, such as a charge below its minimum, says more than a generic decline.
    return {
      error: lastPaymentError.message?.trim() || t('whopCheckout.errors.declined'),
      reason: 'declined',
    };
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

  /** Runs `tokenise` before anything else awaits, so a wallet sheet opens within the tap. */
  const pay = async (tokenise: Tokenise): Promise<void> => {
    if (isPending) return;
    setIsPending(true);
    setError(null);
    // Once charged, the form stays locked even if the webhook is late, so the payer cannot pay twice.
    let charged = false;
    try {
      const confirmationToken = await tokenise();
      if (!confirmationToken) return;
      phCapture('payment_submitted', analytics);
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
        setError(t('whopCheckout.errors.activation_delayed'));
        return;
      }
      if (outcome) fail(outcome);
    } catch (caught) {
      const errorKey = payErrorKey(caught);
      fail({ error: t(errorKey), reason: failureReason(errorKey) });
    } finally {
      if (!charged) setIsPending(false);
    }
  };

  return { pay, isPending, error };
}
