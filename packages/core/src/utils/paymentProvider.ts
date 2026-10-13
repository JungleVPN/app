import type { PaymentMethod, UserScope } from '@workspace/types';

/** The providers that can take global (non-RU) payments — each a `PaymentMethod` too. */
export type GlobalPaymentProvider = Extract<PaymentMethod, 'whop' | 'stripe'>;

const GLOBAL_PROVIDERS: readonly GlobalPaymentProvider[] = ['whop', 'stripe'];

const isGlobalProvider = (value: string): value is GlobalPaymentProvider =>
  GLOBAL_PROVIDERS.some((provider) => provider === value);

/**
 * Case-insensitive, like the payments service's own `GLOBAL_PAYMENT_PROVIDER`.
 * Anything unset or unrecognised falls back to Whop, so a typo in the env
 * var can never reach the payment page as a method no button handles.
 */
function parseGlobalProvider(value: string | undefined): GlobalPaymentProvider {
  const normalised = (value ?? '').toLowerCase();
  return isGlobalProvider(normalised) ? normalised : 'whop';
}

/**
 * Which provider global (non-RU) visitors check out through — both on the
 * public `/payment/:planId` route and on the authenticated profile payment
 * page. One of `whop` (the default) or `stripe`: both stay fully
 * wired behind the same flows, so switching between them is this one env var
 * (matched by `GLOBAL_PAYMENT_PROVIDER` on the payments service).
 *
 * RU visitors never reach here — they pay through YooKassa in the profile.
 */
export const GLOBAL_PAYMENT_PROVIDER: GlobalPaymentProvider = parseGlobalProvider(
  import.meta.env.PUBLIC_GLOBAL_PAYMENT_PROVIDER as string | undefined,
);

/**
 * Whether the prices this storefront shows already include tax. True only
 * where Whop takes the payment: its plans are set tax-inclusive, so the
 * price shown is the price charged. Stripe and YooKassa make no such
 * promise here, so no note is shown for them.
 */
export function pricesIncludeTax(input: {
  scope: UserScope;
  provider: GlobalPaymentProvider;
}): boolean {
  return input.scope === 'global' && input.provider === 'whop';
}
