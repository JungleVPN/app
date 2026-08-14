/**
 * Payments domain types.
 *
 * - `./yookassa/*` — type surface mirrored from `@webzaytsev/yookassa-ts-sdk`
 *   (MIT). Gives us canonical YooKassa shapes + comments without a runtime dep.
 * - `./autopayment` — our own DTOs for the autopayment flow.
 */

export * from './admin';
export * from './common';
export * from './promo';
export * from './stripe';
export * from './telegram-stars';
export * from './tolt';
export * from './yookassa';
