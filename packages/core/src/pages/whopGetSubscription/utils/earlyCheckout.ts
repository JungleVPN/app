import type { SubscriptionPlanDto } from '@workspace/types';
import type { WhopCheckoutState } from '../../whopCheckout/whopCheckoutState';
import type { PreparedCheckout } from '../hooks/usePreparedCheckout';

interface EarlyCheckoutOptions {
  /** The page's checkout, carrying the total the payer is shown. */
  checkout: WhopCheckoutState;
  prepared: PreparedCheckout | null;
  plan: SubscriptionPlanDto | undefined;
  /** The Whop account the page is configured with, if any. */
  configuredAccountId: string | null;
}

interface EarlyCheckout {
  /** The checkout the wallet probe and the card form load against. */
  checkout: WhopCheckoutState;
  /** Wallets need the account, the total and whether the plan renews. */
  canProbeWallets: boolean;
  /** The card form needs the account and the Whop plan it bills. */
  canMountCard: boolean;
}

/**
 * The checkout the wallets and the card form load against before the backend
 * accepts one, so both load while the payer is still giving their email: the
 * configured account, the Whop plan the plans name, and renewing unless the
 * plan is a one-time trial. Once the backend accepts the checkout, its account,
 * plan and renewal are the ones used, and anything that guessed differently
 * loads again.
 */
export function earlyCheckout({
  checkout,
  prepared,
  plan,
  configuredAccountId,
}: EarlyCheckoutOptions): EarlyCheckout {
  if (prepared) return { checkout, canProbeWallets: true, canMountCard: true };
  if (!configuredAccountId || !plan) {
    return { checkout, canProbeWallets: false, canMountCard: false };
  }
  return {
    checkout: {
      ...checkout,
      accountId: configuredAccountId,
      renews: !plan.isTrial,
      ...(plan.checkoutPlanId ? { whopPlanId: plan.checkoutPlanId } : {}),
    },
    canProbeWallets: true,
    canMountCard: plan.checkoutPlanId !== undefined,
  };
}
