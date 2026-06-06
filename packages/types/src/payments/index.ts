/**
 * Payments domain types.
 *
 * - `./yookassa/*` — type surface mirrored from `@webzaytsev/yookassa-ts-sdk`
 *   (MIT). Gives us canonical YooKassa shapes + comments without a runtime dep.
 * - `./autopayment` — our own DTOs for the autopayment flow.
 */

export * from './admin';
export * from './telegram-stars';
export * from './yookassa';
