import type { CreatePublicWhopCheckoutDto, WhopPromoCodeDto } from '@workspace/types';

/**
 * What a Whop payment needs: the result of the checkout-init call, which owns
 * validation (email, plan, duplicate subscription, throttling), plus the promo
 * and total the payer was shown.
 */
export interface WhopCheckoutState {
  /** The Whop account (`biz_...`) we sell from. */
  accountId: string;
  /** The Whop plan (`plan_...`) being bought. */
  whopPlanId: string;
  /** Whether the plan renews, so a wallet must save the card for off-session renewals. */
  renews?: boolean;
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
