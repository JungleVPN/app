import { useEffect } from 'react';
import type { createPaymentsApi } from '../api';
import { isNewAffCode, readLandingAffCode, writeToltAttribution } from '../utils';

/**
 * Records an affiliate click and stores the resolved partner in the browser.
 *
 * This is the half of the old `tlt.js` we still need. Resolution happens on our
 * backend rather than here so the Tolt API key never reaches the page — the
 * visitor has no account yet, which is why that endpoint is public.
 *
 * Runs on every landing, and a new code always replaces the stored one: last
 * click wins, so the partner whose link actually brought the user back is the
 * one credited. `tlt.js` did the opposite, keeping its first partner for 30
 * days and ignoring newer links entirely.
 *
 * A repeat visit on the same link is skipped, so reloading a partner's URL
 * does not inflate their click count.
 */
export function useToltLanding(paymentsApi: ReturnType<typeof createPaymentsApi>): void {
  useEffect(() => {
    const affCode = readLandingAffCode();
    if (!affCode || !isNewAffCode(affCode)) return;

    let cancelled = false;

    void paymentsApi
      .recordToltClick({
        affCode,
        page: window.location.href,
        referrer: document.referrer || null,
      })
      .then((resolved) => {
        if (cancelled) return;
        writeToltAttribution({
          referralCode: affCode,
          partnerId: resolved.partnerId,
          clickId: resolved.clickId,
        });
      })
      // A 404 means the code is not a partner's; anything else is a transport
      // problem. Neither should surface to a visitor who is just loading a page.
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [paymentsApi]);
}
