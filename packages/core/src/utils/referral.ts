const COOKIE_NAME = 'jv_referral';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function setCookie(value: string): void {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function readCookie(): string | null {
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
}

function deleteCookie(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Captures the `ref` URL param into a 30-day cookie on first touch.
 * Called on every page load so that any entry point (landing, /subscribe, etc.)
 * can capture the code. The first-touch guard prevents overwriting an already-
 * stored code when the user navigates internally.
 */
export function captureReferral(): void {
  if (typeof window === 'undefined') return;
  if (readCookie()) return; // first-touch only

  const inviterId = new URLSearchParams(window.location.search).get('ref');
  if (!inviterId) return;

  setCookie(inviterId);
}

export function getReferral(): string | null {
  if (typeof window === 'undefined') return null;
  return readCookie();
}

/** Clears the referral cookie once it has been used to attribute an account. */
export function clearReferral(): void {
  if (typeof window === 'undefined') return;
  deleteCookie();
}
