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

/** Reports a successful payment to Google Ads. No-op if gtag.js hasn't loaded (e.g. blocked). */
export function trackPurchaseConversion(): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', 'conversion', { send_to: PURCHASE_CONVERSION_SEND_TO });
}
