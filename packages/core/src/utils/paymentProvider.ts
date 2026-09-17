/**
 * Which provider global (non-RU) visitors check out through, on the one
 * `/payment/:planSlug` route. Paddle is primary; Stripe stays fully wired
 * behind the same flow, so switching back is this constant and nothing else.
 *
 * RU visitors never reach here — they pay through YooKassa in the profile.
 */
export const GLOBAL_PAYMENT_PROVIDER: string = import.meta.env.GLOBAL_PAYMENT_PROVIDER || 'paddle';
