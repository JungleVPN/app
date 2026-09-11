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

const LOGIN_CONVERSION_SEND_TO = 'AW-18413233512/296KCJf2pu4cEOjKjsxE';

/** Reports the login conversion to Google Ads. No-op if gtag.js hasn't loaded (e.g. blocked). */
export function trackLoginConversion(): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', 'conversion', { send_to: LOGIN_CONVERSION_SEND_TO });
}
