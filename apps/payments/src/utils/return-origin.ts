import * as process from 'node:process';

const DEFAULT_RETURN_URL = 'https://jungle-vpn.com/profile/subscription';

function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

/**
 * Where to send the user back to after a payment, on the same domain they
 * started it from. `requestOrigin` is the `Origin` header of the request that
 * created the session — trusted only when it's one of this app's own domains
 * (CORS_ORIGIN), since it would otherwise be an open redirect. Falls back to
 * RETURN_URL_WEB (a full URL, not just an origin) when the origin is missing
 * or unrecognised — e.g. a non-browser caller, or a domain not yet allowlisted.
 */
export function resolveReturnUrl(requestOrigin: string | undefined, path: string): string {
  const normalizedOrigin = requestOrigin?.trim().replace(/\/+$/, '');
  if (normalizedOrigin && allowedOrigins().includes(normalizedOrigin)) {
    return `${normalizedOrigin}${path}`;
  }
  return process.env.RETURN_URL_WEB || DEFAULT_RETURN_URL;
}
