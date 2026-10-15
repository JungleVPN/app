import { useEffect, useRef, useState } from 'react';
import { usePaymentsApi } from '../../../runtime';
import { getReferralUserId, trackCheckoutStarted } from '../../../utils';
import { type CheckoutRequest, useCheckout } from '../../getSubscription/hooks/useCheckout';
import type { WhopCheckoutState } from '../../whopCheckout/whopCheckoutState';

/** The checkout the backend accepted: what a payment needs, before any promo or total. */
export type PreparedCheckout = Pick<
  WhopCheckoutState,
  'accountId' | 'whopPlanId' | 'renews' | 'request' | 'selectedPeriod'
>;

/** Stands in until the backend accepts a checkout; nothing can pay while it does. */
export const NOT_PREPARED: PreparedCheckout = {
  accountId: '',
  whopPlanId: '',
  request: { email: '', planId: '' },
  selectedPeriod: 0,
};

/**
 * The shared checkout flow, where starting a checkout means asking the backend
 * to accept it (email, plan, no active subscription). `prepared` stays null
 * until it has. A signed-in payer has no email step, so their checkout is
 * accepted on arrival and again on each `retryPrepare` after a failure.
 */
export function usePreparedCheckout() {
  const paymentsApi = usePaymentsApi();
  const [prepared, setPrepared] = useState<PreparedCheckout | null>(null);
  const [prepareAttempt, setPrepareAttempt] = useState(0);

  const startCheckout = async ({ email, planId, selectedPeriod }: CheckoutRequest) => {
    const request = {
      email,
      planId,
      toltReferralId: window.tolt_referral ?? null,
      inviterId: getReferralUserId() ?? undefined,
    };
    const {
      accountId,
      planId: whopPlanId,
      renews,
    } = await paymentsApi.createPublicWhopCheckout(request);

    trackCheckoutStarted({ paymentProvider: 'whop', days: selectedPeriod });

    setPrepared({ accountId, whopPlanId, renews, request, selectedPeriod });
  };

  const checkout = useCheckout(startCheckout);

  const { isAuthenticated, plan, handleSubmit } = checkout;
  const latestHandleSubmit = useRef(handleSubmit);
  latestHandleSubmit.current = handleSubmit;
  const hasPlan = plan !== undefined;
  // biome-ignore lint/correctness/useExhaustiveDependencies: prepareAttempt re-runs the effect on purpose
  useEffect(() => {
    if (!isAuthenticated || !hasPlan) return;
    void latestHandleSubmit.current();
  }, [isAuthenticated, hasPlan, prepareAttempt]);

  return {
    checkout,
    prepared,
    retryPrepare: () => setPrepareAttempt((attempt) => attempt + 1),
  };
}
