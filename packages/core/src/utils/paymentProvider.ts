/**
 * Which provider global (non-RU) visitors check out through — both on the
 * public `/payment/:planSlug` route and on the authenticated profile payment
 * page. Paddle is primary; Stripe stays fully wired behind the same flows, so
 * switching back is this one env var and nothing else.
 *
 * RU visitors never reach here — they pay through YooKassa in the profile.
 */
export const GLOBAL_PAYMENT_PROVIDER: string =
  (import.meta.env.PUBLIC_GLOBAL_PAYMENT_PROVIDER as string | undefined) || 'paddle';
