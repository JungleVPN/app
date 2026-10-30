import {
  ACTIVE_SUBSCRIPTION_CODE,
  PROMO_CODE_INVALID_CODE,
  type WhopPromoRejectionReason,
} from '@workspace/types';
import { ApiClientError } from '../../../../api';

/** Whether the backend refused the checkout because the caller was rate limited. */
export function isThrottledError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 429;
}

/**
 * Whether the backend refused the checkout because the payer email already has
 * an active subscription, rather than because the checkout failed to prepare.
 */
export function isActiveSubscriptionError(error: unknown): boolean {
  if (!(error instanceof ApiClientError) || error.status !== 409) return false;

  const data = error.data;
  // The code is what identifies the case; a 409 from this endpoint means only
  // this today, so an unparsed body is still treated as it.
  if (typeof data !== 'object' || data === null) return true;
  return (data as { code?: string }).code === ACTIVE_SUBSCRIPTION_CODE;
}

/** Whether the backend refused the checkout because the promo code does not apply to the plan. */
export function isPromoCodeInvalidError(error: unknown): boolean {
  if (!(error instanceof ApiClientError) || error.status !== 400) return false;
  const data = error.data;
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { code?: string }).code === PROMO_CODE_INVALID_CODE
  );
}

const PROMO_REJECTION_KEYS: Readonly<Record<WhopPromoRejectionReason, string>> = {
  new_users_only: 'payment.promo.alert.notNewUser',
  one_per_customer: 'payment.promo.alert.alreadyUsed',
  not_eligible: 'payment.promo.alert.notEligible',
};

const PROMO_REJECTION_REASONS: ReadonlySet<string> = new Set(Object.keys(PROMO_REJECTION_KEYS));

function isPromoRejectionReason(value: unknown): value is WhopPromoRejectionReason {
  return typeof value === 'string' && PROMO_REJECTION_REASONS.has(value);
}

/** Why Whop refused the promo code for this payer, when the backend said. */
function promoRejectionKey(error: ApiClientError): string | null {
  const data = error.data;
  if (typeof data !== 'object' || data === null || !('reason' in data)) return null;
  return isPromoRejectionReason(data.reason) ? PROMO_REJECTION_KEYS[data.reason] : null;
}

/**
 * The i18n key describing why a checkout could not be started, for flows that
 * show the reason inline instead of opening the active-subscription dialog.
 */
export function checkoutErrorKey(error: unknown): string {
  if (isThrottledError(error)) return 'getSubscription.throttled_error';
  if (isActiveSubscriptionError(error)) return 'getSubscription.active_subscription_error';
  if (error instanceof ApiClientError && isPromoCodeInvalidError(error)) {
    return promoRejectionKey(error) ?? 'whopCheckout.errors.promo_invalid';
  }
  return 'getSubscription.checkout_error';
}
