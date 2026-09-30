/**
 * Google Ads conversion tracking.
 *
 * gtag.js itself is loaded via a <script> tag in index.html (apps/web only),
 * not bundled here — this module just reports conversions through the global
 * `window.gtag` it installs.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const PURCHASE_CONVERSION_SEND_TO = 'AW-18413233512/296KCJf2pu4cEOjKjsxE';

/**
 * A completed payment as Google Ads sees it. The transaction id lets Google
 * drop a repeat report of the same payment; value and currency travel together
 * and are left out when the amount paid is unknown.
 */
export type PurchaseConversion = {
  transactionId: string;
  value?: number;
  currency?: string;
};

/** Reports a successful payment to Google Ads. No-op if gtag.js hasn't loaded (e.g. blocked). */
export function trackPurchaseConversion({
  transactionId,
  value,
  currency,
}: PurchaseConversion): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', 'conversion', {
    send_to: PURCHASE_CONVERSION_SEND_TO,
    transaction_id: transactionId,
    ...(value !== undefined && currency !== undefined ? { value, currency } : {}),
  });
}
