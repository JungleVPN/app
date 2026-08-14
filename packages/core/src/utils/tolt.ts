/**
 * Affiliate attribution, stored in the browser by this app.
 *
 * A new landing always overwrites, so the partner whose link
 * actually brought the user back is the one credited.
 */

import { readJsonCookie, registrableDomain, writeJsonCookie } from './cookies';

const COOKIE_MAX_AGE_DAYS = 30;

const AFF_PARAM = 'aff';

export type ToltAttribution = {
  /** The partner's referral code. */
  referralCode: string;
  /** Required by Tolt when registering a customer. */
  partnerId: string;
  clickId: string | null;
};

/**
 * Current attribution, or null when the visitor was not referred
 *
 * Globals win over cookies: on a fresh affiliate click the globals hold the
 * newly resolved partner while the cookie may still carry an older one.
 */
export function readToltAttribution(): ToltAttribution | null {
  if (typeof window === 'undefined') return null;

  const referralCode =
    typeof window.tolt_referral === 'string' && window.tolt_referral
      ? window.tolt_referral
      : readJsonCookie<string>('tolt_referral');

  const data =
    window.tolt_data && typeof window.tolt_data === 'object'
      ? window.tolt_data
      : readJsonCookie<{ partner_id?: string; click_id?: string }>('tolt_data');

  // Both are required: the code identifies the partner to us, the id identifies
  // them to Tolt. Reporting one without the other would create an
  // unattributable customer.
  if (typeof referralCode !== 'string' || !referralCode) return null;
  if (!data?.partner_id) return null;

  return {
    referralCode,
    partnerId: data.partner_id,
    clickId: data.click_id ?? null,
  };
}

/** The `?aff=` value in the current URL, if this is an affiliate landing. */
export function readLandingAffCode(): string | null {
  if (typeof window === 'undefined') return null;
  const code = new URLSearchParams(window.location.search).get(AFF_PARAM)?.trim();
  return code || null;
}

/**
 * Whether this landing introduces a partner we have not already stored.
 *
 * Guards the click call: without it, every reload of a link would record
 * another click and inflate the partner's numbers.
 */
export function isNewAffCode(code: string): boolean {
  return readToltAttribution()?.referralCode !== code;
}

/**
 * Writes attribution as URI-encoded JSON, on the
 * registrable domain so it survives across subdomains.
 */
export function writeToltAttribution(attribution: ToltAttribution): void {
  if (typeof window === 'undefined') return;

  const options = { maxAgeDays: COOKIE_MAX_AGE_DAYS, domain: registrableDomain() };

  writeJsonCookie('tolt_referral', attribution.referralCode, options);
  writeJsonCookie(
    'tolt_data',
    { partner_id: attribution.partnerId, click_id: attribution.clickId },
    options,
  );

  // Kept in sync so a capture in this same page load sees the new value without
  // waiting for a reload.
  window.tolt_referral = attribution.referralCode;
  window.tolt_data = {
    partner_id: attribution.partnerId,
    click_id: attribution.clickId ?? undefined,
  };
}
