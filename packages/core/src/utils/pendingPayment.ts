import type { PurchaseConversion } from './gtag';

/**
 * The YooKassa payment this tab is currently away paying for.
 *
 * YooKassa sends the user back to the same `return_url` whether the payment
 * succeeded or was cancelled, so the return page has to ask the backend which
 * it was — and the payment id is only known here, at checkout time. Kept in
 * sessionStorage so it dies with the tab and never leaks across tabs.
 */

const PENDING_YOOKASSA_PAYMENT_KEY = 'jungle.pendingYookassaPayment';

export function rememberPendingYookassaPayment(paymentId: string): void {
  try {
    sessionStorage.setItem(PENDING_YOOKASSA_PAYMENT_KEY, paymentId);
  } catch {
    // Storage disabled (private mode, embedded webview) — the return page then
    // falls back to its optimistic success state, which is the old behaviour.
  }
}

/** Reads and clears the pending id, so a reload of the return page is a no-op. */
export function takePendingYookassaPayment(): string | null {
  try {
    const paymentId = sessionStorage.getItem(PENDING_YOOKASSA_PAYMENT_KEY);
    sessionStorage.removeItem(PENDING_YOOKASSA_PAYMENT_KEY);
    return paymentId;
  } catch {
    return null;
  }
}

/**
 * The purchase this tab is about to land on `/payment/success` with, so the
 * return page can report it to Google Ads with its id and amount. Only a
 * checkout knows either, and the return page reports nothing without one — a
 * direct visit or a reload is not a sale.
 */
const PENDING_PURCHASE_KEY = 'jungle.pendingPurchase';

export function rememberPendingPurchase(purchase: PurchaseConversion): void {
  try {
    sessionStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify(purchase));
  } catch {
    // Storage disabled — this purchase goes unreported rather than guessed at.
  }
}

/** Drops the pending purchase, for a payment that turned out not to go through. */
export function forgetPendingPurchase(): void {
  try {
    sessionStorage.removeItem(PENDING_PURCHASE_KEY);
  } catch {
    // Storage disabled — nothing was remembered to drop.
  }
}

/** Reads and clears the pending purchase, so a reload of the return page is a no-op. */
export function takePendingPurchase(): PurchaseConversion | null {
  try {
    const stored = sessionStorage.getItem(PENDING_PURCHASE_KEY);
    sessionStorage.removeItem(PENDING_PURCHASE_KEY);
    return stored === null ? null : toPurchase(JSON.parse(stored));
  } catch {
    return null;
  }
}

function toPurchase(stored: unknown): PurchaseConversion | null {
  if (typeof stored !== 'object' || stored === null || !('transactionId' in stored)) return null;
  const { transactionId } = stored;
  if (typeof transactionId !== 'string' || transactionId.length === 0) return null;
  if (!('value' in stored) || !('currency' in stored)) return { transactionId };
  const { value, currency } = stored;
  if (typeof value !== 'number' || typeof currency !== 'string') return { transactionId };
  return { transactionId, value, currency };
}
