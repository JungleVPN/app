import type { SubscriptionPlanDto } from '@workspace/types';
import type { WhopCheckoutState } from '../../whopCheckout/whopCheckoutState';
import type { PreparedCheckout } from '../hooks/usePreparedCheckout';

interface WalletProbeOptions {
  /** The page's checkout, carrying the total the payer is shown. */
  checkout: WhopCheckoutState;
  prepared: PreparedCheckout | null;
  plan: SubscriptionPlanDto | undefined;
  /** The Whop account the page is configured with, if any. */
  configuredAccountId: string | null;
}

/**
 * The checkout the wallet probe runs against, and whether it can run yet. A
 * wallet needs only the account, the total and whether the plan renews, so it
 * is probed while the payer is still giving their email — against the
 * configured account, and renewing unless the plan is a one-time trial. Once
 * the backend accepts the checkout, its account and renewal are the ones
 * used, and a probe that guessed differently runs again.
 */
export function walletProbe({
  checkout,
  prepared,
  plan,
  configuredAccountId,
}: WalletProbeOptions): { checkout: WhopCheckoutState; enabled: boolean } {
  if (prepared) return { checkout, enabled: true };
  if (!configuredAccountId || !plan) return { checkout, enabled: false };
  return {
    checkout: { ...checkout, accountId: configuredAccountId, renews: !plan.isTrial },
    enabled: true,
  };
}
