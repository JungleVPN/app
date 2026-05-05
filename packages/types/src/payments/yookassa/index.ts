/**
 * YooKassa types mirrored from `@webzaytsev/yookassa-ts-sdk` (MIT).
 *
 * We don't depend on the SDK at runtime — just copy the type surface so we get
 * canonical shapes + documented comments without the single-maintainer risk.
 * When the upstream adds fields we care about, pull them in manually.
 */

export * from './confirmation';
export * from './general';
export * from './payment';
export * from './payment-method';
export * from './saved-method';
export * from './session';
export * from './webhook';
