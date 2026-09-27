/**
 * Which provider global (non-RU) visitors check out through — both on the
 * public `/payment/:planId` route and on the authenticated profile payment
 * page. One of `paddle` (the default), `whop` or `stripe`: all three stay fully
 * wired behind the same flows, so switching between them is this one env var
 * (matched by `GLOBAL_PAYMENT_PROVIDER` on the payments service).
 *
 * RU visitors never reach here — they pay through YooKassa in the profile.
 */
export const GLOBAL_PAYMENT_PROVIDER: string =
  (import.meta.env.PUBLIC_GLOBAL_PAYMENT_PROVIDER as string | undefined) || 'paddle';
