import type { PaymentMethod } from '@workspace/types';

/** The providers that can take global (non-RU) payments — each a `PaymentMethod` too. */
export type GlobalPaymentProvider = Extract<PaymentMethod, 'paddle' | 'whop' | 'stripe'>;

const GLOBAL_PROVIDERS: readonly GlobalPaymentProvider[] = ['paddle', 'whop', 'stripe'];

const isGlobalProvider = (value: string): value is GlobalPaymentProvider =>
  GLOBAL_PROVIDERS.some((provider) => provider === value);

/**
 * Case-insensitive, like the payments service's own `GLOBAL_PAYMENT_PROVIDER`.
 * Anything unset or unrecognised falls back to Paddle, so a typo in the env
 * var can never reach the payment page as a method no button handles.
 */
function parseGlobalProvider(value: string | undefined): GlobalPaymentProvider {
  const normalised = (value ?? '').toLowerCase();
  return isGlobalProvider(normalised) ? normalised : 'paddle';
}

/**
 * Which provider global (non-RU) visitors check out through — both on the
 * public `/payment/:planId` route and on the authenticated profile payment
 * page. One of `paddle` (the default), `whop` or `stripe`: all three stay fully
 * wired behind the same flows, so switching between them is this one env var
 * (matched by `GLOBAL_PAYMENT_PROVIDER` on the payments service).
 *
 * RU visitors never reach here — they pay through YooKassa in the profile.
 */
export const GLOBAL_PAYMENT_PROVIDER: GlobalPaymentProvider = parseGlobalProvider(
  import.meta.env.PUBLIC_GLOBAL_PAYMENT_PROVIDER as string | undefined,
);
