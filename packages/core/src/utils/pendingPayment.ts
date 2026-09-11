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
