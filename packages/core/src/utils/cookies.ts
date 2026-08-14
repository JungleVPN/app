/**
 * Browser cookie access, shared by the three things that need it: the referral
 * programme, affiliate attribution and marketing attribution.
 *
 * Only the mechanics live here. Each of those decides its own policy — first
 * touch versus last, whether a value is ever cleared, how long it lives — and
 * those rules differ on purpose, so they stay in their own modules.
 */

export type CookieOptions = {
  maxAgeDays?: number;
  /** Set to share a cookie across subdomains; omit to keep it host-only. */
  domain?: string;
  sameSite?: 'lax' | 'strict' | 'none';
};

const DEFAULT_MAX_AGE_DAYS = 30;

/** The raw string value, or null when the cookie is not set. */
export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  // Split on the full `name=` prefix rather than scanning entries, so a value
  // containing `=` or `; ` survives intact and a cookie whose name merely ends
  // with this one is not mistaken for it.
  const parts = `; ${document.cookie}`.split(`; ${name}=`);
  if (parts.length < 2) return null;

  const raw = parts.pop()?.split(';').shift();
  return raw ? decodeURIComponent(raw) : null;
}

/** A JSON-encoded cookie, or null when absent or unparseable. */
export function readJsonCookie<T>(name: string): T | null {
  const raw = readCookie(name);
  if (raw === null) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (typeof document === 'undefined') return;

  const maxAge = (options.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS) * 24 * 60 * 60;
  const attributes = [
    `path=/`,
    `max-age=${maxAge}`,
    `samesite=${options.sameSite ?? 'lax'}`,
    options.domain ? `domain=${options.domain}` : '',
  ].filter(Boolean);

  document.cookie = `${name}=${encodeURIComponent(value)};${attributes.join(';')}`;
}

export function writeJsonCookie(name: string, value: unknown, options?: CookieOptions): void {
  writeCookie(name, JSON.stringify(value), options);
}

export function removeCookie(name: string, options: CookieOptions = {}): void {
  writeCookie(name, '', { ...options, maxAgeDays: 0 });
}

/**
 * `app.example.com` → `example.com`, so a cookie is shared by every subdomain.
 * Localhost and bare IPs are returned unchanged — neither can carry a domain
 * attribute the browser will accept.
 */
export function registrableDomain(): string {
  const host = window.location.hostname;
  if (host === 'localhost' || /^[\d.]+$/.test(host)) return host;

  const parts = host.split('.');
  return parts.length > 2 ? parts.slice(-2).join('.') : host;
}
