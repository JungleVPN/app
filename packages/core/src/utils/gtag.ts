/**
 * Google Ads and Microsoft Ads conversion tracking.
 *
 * gtag.js and the UET tag are loaded via <script> tags in index.html
 * (apps/web only), not bundled here — this module just reports conversions
 * through the globals they install: `window.gtag` and `window.uetq`.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    uetq?: { push: (...args: unknown[]) => unknown };
  }
}

const PURCHASE_CONVERSION_SEND_TO = 'AW-18413233512/ZKs7CPXg350dEOjKjsxE';

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

/** Reports a successful payment to Google Ads and Microsoft Ads. Each is a no-op if its tag hasn't loaded (e.g. blocked). */
export function trackPurchaseConversion(purchase: PurchaseConversion): void {
  if (typeof window === 'undefined') return;
  reportToGoogleAds(purchase);
  reportToMicrosoftAds(purchase);
}

function reportToMicrosoftAds({ value, currency }: PurchaseConversion): void {
  if (typeof window.uetq?.push !== 'function') return;
  window.uetq.push(
    'event',
    'purchase',
    value !== undefined && currency !== undefined ? { revenue_value: value, currency } : {},
  );
}

function reportToGoogleAds({ transactionId, value, currency }: PurchaseConversion): void {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'conversion', {
    send_to: PURCHASE_CONVERSION_SEND_TO,
    transaction_id: transactionId,
    ...(value !== undefined && currency !== undefined ? { value, currency } : {}),
  });
}

/** Passes the cookie banner's decision on to Microsoft Ads, which otherwise keeps treating the visitor as denied. */
export function updateAdsConsent({ granted }: { granted: boolean }): void {
  if (typeof window === 'undefined' || typeof window.uetq?.push !== 'function') return;
  window.uetq.push('consent', 'update', { ad_storage: granted ? 'granted' : 'denied' });
}
