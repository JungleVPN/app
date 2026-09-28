import { useWhop } from '@whop/elements-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../runtime';
import { checkoutErrorKey } from '../getSubscription/checkoutErrors';
import type { WhopCheckoutState } from './whopCheckoutState';

/** Thrown when Whop cannot tokenise the card — its own field already marks what is wrong. */
export class CardTokenError extends Error {}

/** Thrown when a wallet sheet could not open or complete — anything but the payer dismissing it. */
export class WalletSheetError extends Error {}

/** A Whop payment status that needs nothing more from the payer. */
const SETTLED_STATUSES: ReadonlySet<string> = new Set(['succeeded', 'processing']);

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

  /** `'paid'`, null when the payer left for an off-site step, or the text to show them. */
  const charge = async (confirmationToken: string): Promise<'paid' | null | { error: string }> => {
    const payment = await paymentsApi.payPublicWhopCheckout({
      ...checkout.request,
      confirmationToken,
      returnUrl,
      ...(checkout.promo ? { promoCode: checkout.promo.code } : {}),
    });
    if (payment.status === 'paid') return 'paid';
    if (!whop || !payment.clientSecret) return { error: t('whopCheckout.errors.not_completed') };

    const result = await whop.payments.handleNextAction({ clientSecret: payment.clientSecret });
    if (result.redirected) return null;
    if (SETTLED_STATUSES.has(result.status)) return 'paid';
    const { lastPaymentError } = result;
    if (!lastPaymentError) return { error: t('whopCheckout.errors.not_completed') };
    // Whop's own explanation, such as a charge below its minimum, says more than a generic decline.
    return { error: lastPaymentError.message?.trim() || t('whopCheckout.errors.declined') };
  };

  /** Runs `tokenise` before anything else awaits, so a wallet sheet opens within the tap. */
  const pay = async (tokenise: Tokenise): Promise<void> => {
    if (isPending) return;
    setIsPending(true);
    setError(null);
    try {
      const confirmationToken = await tokenise();
      if (!confirmationToken) return;
      const outcome = await charge(confirmationToken);
      if (outcome === 'paid') {
        navigate(paymentReturnPath, { replace: true });
        return;
      }
      if (outcome) setError(outcome.error);
    } catch (caught) {
      setError(t(payErrorKey(caught)));
    } finally {
      setIsPending(false);
    }
  };

  return { pay, isPending, error };
}
