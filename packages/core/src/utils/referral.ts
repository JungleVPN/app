const STORAGE_KEY = 'jv_referral';

/**
 * Captures the `ref` URL param into localStorage as soon as the app boots.
 * Reading it lazily from window.location.search at submit time loses it if
 * client-side navigation (e.g. an auth redirect) drops the query string
 * before the user finishes signup.
 */
export function captureReferral(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(STORAGE_KEY)) return; // first-touch only

  const inviterId = new URLSearchParams(window.location.search).get('ref');

  if (!inviterId) return;

  localStorage.setItem(STORAGE_KEY, inviterId);
}

export function getReferral(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}
