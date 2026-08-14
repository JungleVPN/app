import { readCookie, removeCookie, writeCookie } from './cookies';

/**
 * User-to-user referral: one customer inviting another.
 *
 * Distinct from affiliate attribution in `tolt.ts`, and deliberately so — this
 * is **first touch**, and the code is consumed once it has been attached to an
 * account. Affiliate attribution is last-click and is never cleared. They share
 * only the cookie mechanics.
 */

const COOKIE_NAME = 'jv_referral';

/**
 * Captures the `ref` URL param on first touch.
 *
 * Called on every page load so any entry point can capture it. The first-touch
 * guard stops an already-stored code being overwritten as the user navigates.
 */
export function captureReferral(): void {
  if (typeof window === 'undefined') return;
  if (readCookie(COOKIE_NAME)) return;

  const inviterId = new URLSearchParams(window.location.search).get('ref');
  if (!inviterId) return;

  writeCookie(COOKIE_NAME, inviterId);
}

export function getReferral(): string | null {
  return readCookie(COOKIE_NAME);
}

/** Clears the referral once it has been used to attribute an account. */
export function clearReferral(): void {
  removeCookie(COOKIE_NAME);
}
