import { Injectable } from '@nestjs/common';
import { type Whop, WhopClient, WhopEnvironment, WhopError } from '@whop/sdk';
import type { WhopPaymentDto, WhopPromoCodeDto } from '@workspace/types';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function resolveEnvironment(): WhopEnvironment {
  const value = process.env.WHOP_ENVIRONMENT;
  if (value !== 'sandbox' && value !== 'production') {
    throw new Error(
      `WHOP_ENVIRONMENT must be set to "sandbox" or "production" (got: ${value ?? 'unset'}). ` +
        'This is never defaulted, so a misconfigured deploy fails loudly instead of silently billing the wrong Whop account.',
    );
  }
  return value === 'sandbox' ? WhopEnvironment.Sandbox : WhopEnvironment.Production;
}

/** Membership statuses Whop already counts as canceled, refusing to cancel them again. */
const CANCELED_MEMBERSHIP_STATUSES: ReadonlySet<string> = new Set([
  'canceling',
  'canceled',
  'expired',
]);

/**
 * Thrown by `createPayment` when Whop refuses the promo code for this payer —
 * e.g. a new-users-only code paid for by an existing customer. Whop only knows
 * the payer once it charges, so this can't be caught when the code is applied.
 */
export class WhopPromoRejectedError extends Error {}

/** Customers Whop may limit a promo code to; it checks the payer only when charging. */
export type WhopPromoRestriction =
  | 'new_users_only'
  | 'existing_memberships_only'
  | 'churned_users_only'
  | 'one_per_customer';

const PROMO_RESTRICTIONS: readonly WhopPromoRestriction[] = [
  'new_users_only',
  'existing_memberships_only',
  'churned_users_only',
  'one_per_customer',
];

/** A promo code found for a plan, with what the browser needs and what `createPayment` charges with. */
export type FoundPromoCode = WhopPromoCodeDto & {
  id: string;
  restrictions: WhopPromoRestriction[];
};

/** A code from Whop's list that has text, as every code a payer can type does. */
type ListedPromoCode = Whop.PromoCodeListItem & { code: string };

/** `promo` as a code the payer can use, or null when it has expired or run out. */
function usablePromoCode(promo: ListedPromoCode): FoundPromoCode | null {
  if (promo.expires_at && Date.parse(promo.expires_at) <= Date.now()) return null;
  if (!promo.unlimited_stock && promo.uses >= promo.stock) return null;
  return {
    id: promo.id,
    code: promo.code,
    promoType: promo.promo_type,
    amountOff: percentOrAmountOff(promo.promo_type, promo.amount_off),
    currency: promo.currency,
    restrictions: PROMO_RESTRICTIONS.filter((restriction) => promo[restriction]),
  };
}

/** Whop's reason for refusing the payment's promo code, or null when it refused for another reason. */
function promoRejection(err: unknown): string | null {
  if (!(err instanceof WhopError) || err.statusCode !== 400) return null;
  const body = err.body;
  if (typeof body !== 'object' || body === null || !('error' in body)) return null;
  const { error } = body;
  if (typeof error !== 'object' || error === null) return null;
  if (!('code' in error) || error.code !== 'promo_invalid') return null;
  return 'message' in error && typeof error.message === 'string' ? error.message : '';
}

/**
 * Whop gives a percentage discount as a fraction (0.2 for 20% off); our DTO
 * carries percent. Rounded to two decimals so 0.07 reads as 7, not 7.000000000000001.
 */
function percentOrAmountOff(promoType: string, amountOff: number): number {
  return promoType === 'percentage' ? Math.round(amountOff * 10_000) / 100 : amountOff;
}

@Injectable()
export class WhopClientService {
  readonly whop: WhopClient;
  /** The Whop account (`biz_...`) we sell from — every lookup is scoped to it. */
  readonly accountId: string;

  constructor() {
    const token = requireEnv('WHOP_API_KEY');
    this.accountId = requireEnv('WHOP_ACCOUNT_ID');
    this.whop = new WhopClient({ token, environment: resolveEnvironment() });
  }

  /**
   * The active promo code `code` names for `planId`, or null when the plan
   * offers no such code or it can no longer be used. A code limited to certain
   * customers is still found: Whop checks the payer when charging (see
   * `createPayment`). Whop can't look a code up by its text, so this reads the
   * plan's active codes and matches it — then, since Whop lists a code made for
   * every product under no plan, our account's codes that name no product.
   */
  async findPromoCode(input: { code: string; planId: string }): Promise<FoundPromoCode | null> {
    const wanted = input.code.trim().toLocaleUpperCase();
    if (!wanted) return null;

    const forPlan = await this.findListedCode(wanted, { plan_ids: input.planId });
    if (forPlan) return usablePromoCode(forPlan);

    const forAccount = await this.findListedCode(wanted, {});
    return forAccount?.product === null ? usablePromoCode(forAccount) : null;
  }

  /** Our account's active code `wanted`, among those `scope` narrows the list to. */
  private async findListedCode(
    wanted: string,
    scope: { plan_ids?: string },
  ): Promise<ListedPromoCode | null> {
    const codes = await this.whop.promoCodes.list({
      account_id: this.accountId,
      ...scope,
      status: 'active',
    });
    for await (const promo of codes.data) {
      const { code } = promo;
      if (code?.toLocaleUpperCase() === wanted) return { ...promo, code };
    }
    return null;
  }

  /**
   * Charges the card the browser tokenised (`ctok_...`) for `planId`. Whop
   * copies `metadata` onto the payment — that is how the webhook identifies
   * the payer. The payment may still need a buyer step (3DS), which the
   * browser finishes with `clientSecret`. Throws `WhopPromoRejectedError`
   * when Whop refuses the promo code for this payer.
   */
  async createPayment(input: {
    planId: string;
    confirmationToken: string;
    email: string;
    metadata: Record<string, string>;
    returnUrl: string;
    promoCodeId?: string;
  }): Promise<WhopPaymentDto> {
    const payment = await this.whop.payments
      .create({
        account_id: this.accountId,
        plan_id: input.planId,
        confirmation_token: input.confirmationToken,
        email: input.email,
        metadata: input.metadata,
        return_url: input.returnUrl,
        ...(input.promoCodeId ? { promo_code_id: input.promoCodeId } : {}),
      })
      .catch((err: unknown) => {
        const reason = promoRejection(err);
        throw reason === null ? err : new WhopPromoRejectedError(reason);
      });
    return { paymentId: payment.id, status: payment.status, clientSecret: payment.client_secret };
  }

  /**
   * Stops `membershipId` renewing. Access continues until the current period
   * ends — the user keeps what they paid for; Whop's `membership.deactivated`
   * then marks the saved method terminated when it lapses.
   *
   * Whop refuses a second cancel, and one made in the Whop dashboard or app
   * may not have reached us yet, so a membership already canceled there is
   * reported as canceled instead of canceled again.
   */
  async cancelMembership(
    membershipId: string,
  ): Promise<{ cancelAtPeriodEnd: boolean; accessUntil: string | null }> {
    const current = await this.whop.memberships.retrieve({ id: membershipId });
    if (current.cancel_at_period_end || CANCELED_MEMBERSHIP_STATUSES.has(current.status)) {
      return { cancelAtPeriodEnd: true, accessUntil: current.current_period_end };
    }
    const membership = await this.whop.memberships.cancel({
      id: membershipId,
      cancel_at_period_end: true,
    });
    return {
      cancelAtPeriodEnd: membership.cancel_at_period_end,
      accessUntil: membership.current_period_end,
    };
  }

  /**
   * Reverses `membershipId`'s pending cancellation, so it renews again at the
   * end of its period. Only possible before that period ends. Whop's
   * `uncancel` endpoint is Legacy API only; the current API does it by update.
   */
  async uncancelMembership(membershipId: string): Promise<{ cancelAtPeriodEnd: boolean }> {
    const membership = await this.whop.memberships.update({
      id: membershipId,
      cancel_at_period_end: false,
    });
    return { cancelAtPeriodEnd: membership.cancel_at_period_end };
  }
}
