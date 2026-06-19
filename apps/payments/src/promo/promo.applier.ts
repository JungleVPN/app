import type { PromoEffect } from '@workspace/types';

/**
 * Pure effect appliers. Each promo effect type has exactly one handler here, so
 * adding a new effect (e.g. a discount) is a single entry — no payment-flow or
 * service changes. Keeping these pure makes them trivially unit-testable.
 */

/** Bonus subscription months granted by an effect (0 if it doesn't grant any). */
export function bonusMonthsFromEffect(effect: PromoEffect): number {
  switch (effect.type) {
    case 'bonus_months':
      return effect.months;
    default:
      // Exhaustiveness guard: a new effect type must be handled explicitly.
      return 0;
  }
}
