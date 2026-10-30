import type { RemnaUserId } from '../remnawave';
import type { UserScope } from '../utils';
/**
 * Promo (promotional code) domain types — shared between the database entities
 * and the payments service.
 *
 * A promo is *data*: a row carrying a typed `effect`. New campaigns are new
 * rows; new *kinds* of campaign are new members of the `PromoEffect` union (and
 * a matching applier in the payments service). The payment-provider code never
 * needs to change.
 */

/**
 * Who a promo may be used by. `new` requires the user to have never had a settled
 * payment; `expired_only` is for churned users, whose subscription has expired.
 */
export type PromoEligibility = 'all' | 'expired_only' | 'new';

/** Storefront a promo is offered on; `all` offers it on every storefront. */
export type PromoScope = UserScope | 'all';

/**
 * What a promo does. Discriminated union so each effect is applied by its own
 * pure handler. `bonus_months` adds days to the subscription and is granted by
 * our own checkouts; `percentage` and `fixed_amount` take money off and are
 * charged by the provider that holds the code (Whop) — our checkouts refuse them.
 */
export type PromoEffect =
  | { type: 'bonus_months'; days: number }
  | { type: 'percentage'; percent: number }
  | { type: 'fixed_amount'; amount: number; currency: string };

/** How many payments a discount applies to; `multiple_months` reads `durationMonths`. */
export type PromoDuration = 'forever' | 'first_payment' | 'multiple_months';

/** Context resolution needs to decide whether a code is currently usable. */
export interface PromoContext {
  userId: RemnaUserId;
  /** Subscription status from remnawave, when known (for `expired_only`). */
  userStatus?: string;
  /** Days the user is paying for, when known (for min-period style rules). */
  selectedPeriod?: number;
}

/** Body for POST /promo/validate (live feedback on the payment page). */
export interface ValidatePromoDto {
  code: string;
  userId: RemnaUserId;
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
  | 'not_new_user'
  | 'limit_reached'
  | 'already_used'
  | 'not_for_plan'
  | 'unsupported_effect';

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

/** A promo a storefront offers publicly, with what a badge needs to show its conditions. */
export interface PublicPromoDto {
  code: string;
  effect: PromoEffect;
  eligibility: PromoEligibility;
  duration: PromoDuration;
  /** Payments the discount lasts for when `duration` is `multiple_months`, otherwise null. */
  durationMonths: number | null;
  /** ISO timestamp the promo stops working, or null when it doesn't expire. */
  endsAt: string | null;
  perUserLimit: number;
  /** Plan lengths in days the promo applies to, or null for every plan. */
  planPeriods: number[] | null;
}

/** Query for GET /promo — `featured` narrows the list to (or away from) featured promos. */
export interface ListPromosQuery {
  featured?: boolean;
}

/** Response from GET /promo — usable promos of the caller's storefront, newest first. */
export interface PublicPromosResponse {
  promos: PublicPromoDto[];
}
