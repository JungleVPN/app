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

export function cleanReferral(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Re-attaches the captured `ref` (if any) to an internal path as a query param.
 * The invited user can leave GetSubscriptionPage before signing up — e.g. via
 * the header Login button, through the OTP confirm step, or the redirect back
 * here for an account with no remnawave user yet — and every one of those hops
 * lands back on a fresh page load/route. Carrying `ref` explicitly through
 * them means GetSubscriptionPage can re-capture it on each landing instead of
 * depending solely on the original localStorage write surviving the detour.
 */
export function withReferralParam(path: string): string {
  const inviterId = getReferral();
  if (!inviterId) return path;

  const [base, existingSearch] = path.split('?');
  const params = new URLSearchParams(existingSearch);
  console.log(params);
  params.set('ref', inviterId);
  return `${base}?${params.toString()}`;
}
