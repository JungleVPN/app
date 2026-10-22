import { checkoutErrorKey } from '../../getSubscription/utils/checkoutErrors';

/** Thrown when Whop cannot tokenise the card — its own field already marks what is wrong. */
export class CardTokenError extends Error {}

/** Thrown when a wallet sheet could not open or complete — anything but the payer dismissing it. */
export class WalletSheetError extends Error {}

/** The message key for a payment that failed with `caught`. */
export function payErrorKey(caught: unknown): string {
  if (caught instanceof CardTokenError) return 'whopCheckout.errors.card_invalid';
  if (caught instanceof WalletSheetError) return 'whopCheckout.errors.not_completed';
  return checkoutErrorKey(caught);
}
