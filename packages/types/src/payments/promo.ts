/**
 * Promo (promotional code) domain types — shared between the database entities
 * and the payments service.
 *
 * A promo is *data*: a row carrying a typed `effect`. New campaigns are new
 * rows; new *kinds* of campaign are new members of the `PromoEffect` union (and
 * a matching applier in the payments service). The payment-provider code never
 * needs to change.
 */

/** Which payment provider a redemption came through. */
export type PromoProvider = 'yookassa' | 'stripe' | 'stars';

/** Who a promo may be used by. */
export type PromoEligibility = 'all' | 'expired_only';

/**
 * What a promo does. Discriminated union so each effect is applied by its own
 * pure handler. Today only `bonus_months` ships; discounts can be added later
 * (they additionally affect the charged amount — see promo.applier.ts).
 */
export type PromoEffect = { type: 'bonus_months'; months: number };

/** Context resolution needs to decide whether a code is currently usable. */
export interface PromoContext {
  userId: string;
  /** Subscription status from remnawave, when known (for `expired_only`). */
  userStatus?: string;
  /** Months the user is paying for, when known (for min-period style rules). */
  selectedPeriod?: number;
}

/** Body for POST /promo/validate (live feedback on the payment page). */
export interface ValidatePromoDto {
  code: string;
  userId: string;
  userStatus?: string;
  selectedPeriod?: number;
}

/**
 * Stable, machine-readable reason a promo code was rejected. The frontend maps
 * each code to a localized message — the human strings live there, not here, so
 * validation logic and presentation stay in their own layers.
 */
export type PromoErrorCode =
  | 'invalid'
  | 'not_active_yet'
  | 'expired'
  | 'not_eligible'
  | 'limit_reached'
  | 'already_used';

/** Response from POST /promo/validate. */
export interface ValidatePromoResponse {
  valid: boolean;
  /** Human-readable reason when `valid` is false (server default, English). */
  reason?: string;
  /** Stable code for localized client messaging when `valid` is false. */
  code?: PromoErrorCode;
  /** The effect that would be applied when `valid` is true. */
  effect?: PromoEffect;
}
