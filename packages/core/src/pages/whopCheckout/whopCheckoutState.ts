import type { CreatePublicWhopCheckoutDto, WhopPromoCodeDto } from '@workspace/types';

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
  /**
   * The promo code the payer applied before starting, already checked against
   * the plan. Whop fixes a checkout's code when it opens, so it is settled here
   * rather than on the checkout route.
   */
  promo?: WhopPromoCodeDto;
  /**
   * The total the payer was shown, which a wallet sheet displays. Whop charges
   * what the plan says; absent when a promo left the total unknown, and then
   * no wallet is offered.
   */
  charge?: WhopCheckoutCharge;
}

/** An amount as the order summary showed it (`'7.99'`) and its ISO 4217 currency. */
export interface WhopCheckoutCharge {
  amount: string;
  currency: string;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

function isCheckoutRequest(value: unknown): value is CreatePublicWhopCheckoutDto {
  if (typeof value !== 'object' || value === null) return false;
  const request = value as Partial<CreatePublicWhopCheckoutDto>;
  return isNonEmptyString(request.email) && isNonEmptyString(request.planId);
}

function isPromo(value: unknown): value is WhopPromoCodeDto {
  if (typeof value !== 'object' || value === null) return false;
  return isNonEmptyString((value as Partial<WhopPromoCodeDto>).code);
}

function isCharge(value: unknown): value is WhopCheckoutCharge {
  if (typeof value !== 'object' || value === null) return false;
  const charge = value as Partial<WhopCheckoutCharge>;
  return isNonEmptyString(charge.amount) && isNonEmptyString(charge.currency);
}

export function isWhopCheckoutState(value: unknown): value is WhopCheckoutState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Partial<WhopCheckoutState>;
  return (
    isNonEmptyString(state.accountId) &&
    isNonEmptyString(state.whopPlanId) &&
    isCheckoutRequest(state.request) &&
    typeof state.selectedPeriod === 'number' &&
    (state.promo === undefined || isPromo(state.promo)) &&
    (state.charge === undefined || isCharge(state.charge))
  );
}
