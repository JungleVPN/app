import type { CreatePublicWhopCheckoutDto } from '@workspace/types';

/**
 * What the dedicated Whop checkout route needs to mount the card form, handed
 * to it as router state by whichever entry point started the payment.
 *
 * Like Paddle's, it is the *result* of the checkout-init call: the entry point
 * owns validation (email, plan, duplicate subscription, throttling) and the
 * route owns the card form. Router state does not survive a reload or a
 * shared link, so a route that finds none sends the visitor back to pick a plan.
 */
export interface WhopCheckoutState {
  /** The Whop account (`biz_...`) we sell from. */
  accountId: string;
  /** The Whop plan (`plan_...`) being bought. */
  whopPlanId: string;
  /** The validated checkout request, sent again with the card to `public-pay`. */
  request: CreatePublicWhopCheckoutDto;
  /** Plan length in days — carried for analytics, not billing (the plan decides that). */
  selectedPeriod: number;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

function isCheckoutRequest(value: unknown): value is CreatePublicWhopCheckoutDto {
  if (typeof value !== 'object' || value === null) return false;
  const request = value as Partial<CreatePublicWhopCheckoutDto>;
  return isNonEmptyString(request.email) && isNonEmptyString(request.planId);
}

export function isWhopCheckoutState(value: unknown): value is WhopCheckoutState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Partial<WhopCheckoutState>;
  return (
    isNonEmptyString(state.accountId) &&
    isNonEmptyString(state.whopPlanId) &&
    isCheckoutRequest(state.request) &&
    typeof state.selectedPeriod === 'number'
  );
}

/**
 * The metadata a wallet payment carries so the webhook identifies the payer —
 * the same keys the backend stamps on a card charge in `payCheckout`.
 */
export function whopCheckoutMetadata(
  request: CreatePublicWhopCheckoutDto,
  origin: string,
): Record<string, string> {
  return {
    email: request.email,
    ...(request.toltReferralId ? { toltReferralId: request.toltReferralId } : {}),
    ...(request.inviterId != null ? { inviterId: String(request.inviterId) } : {}),
    signupOrigin: origin,
  };
}
