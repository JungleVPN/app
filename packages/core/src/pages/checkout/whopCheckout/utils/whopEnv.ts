import { WHOP_ELEMENTS_LOCALES, type WhopElementsLocale } from '@whop/elements';

/**
 * Read lazily (only when the Whop checkout page actually mounts), not from
 * the shared `coreEnv` object — throwing here must never break unrelated
 * pages that import from this package but never touch Whop (mirrors Paddle).
 */
export function getWhopEnvironment(): 'sandbox' | 'production' {
  const value = import.meta.env.PUBLIC_WHOP_ENVIRONMENT as string | undefined;
  if (value !== 'sandbox' && value !== 'production') {
    throw new Error(
      `PUBLIC_WHOP_ENVIRONMENT must be set to "sandbox" or "production" (got: ${value || 'unset'}). ` +
        'This is never defaulted, so a misconfigured deploy fails loudly instead of silently checking out against the wrong Whop account.',
    );
  }
  return value;
}

/**
 * The Whop account (`biz_...`) the page sells from, so wallets can be probed
 * before the backend accepts a checkout; null when it is not configured, and
 * the page then waits for the backend to name it.
 */
export function getWhopAccountId(): string | null {
  const value = import.meta.env.PUBLIC_WHOP_ACCOUNT_ID as string | undefined;
  return value?.startsWith('biz_') ? value : null;
}

export function toWhopLocale(language: string): WhopElementsLocale {
  const base = language.split('-')[0] ?? language;
  return WHOP_ELEMENTS_LOCALES.includes(base) ? base : 'en';
}
